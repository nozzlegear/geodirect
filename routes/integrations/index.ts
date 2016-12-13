import * as qs from "qs";
import * as joi from "joi";
import * as boom from "boom";
import { Express } from "express";
import inspect from "../../modules/inspect";
import { RouterFunction, User } from "gearworks";
import { ActivatePlanRequest } from "gearworks/requests";
import { BASE_PATH as WEBHOOKS_BASE_PATH } from "../webhooks";
import { users, PromptLogDatabase } from "../../modules/database";
import Plans, { findPlan, getPlanTerms } from "../../modules/plans";
import { Auth, Shops, Webhooks, RecurringCharges, Models, ScriptTags } from "shopify-prime";
import { DEFAULT_SCOPES, SHOPIFY_API_KEY, SHOPIFY_SECRET_KEY, ISLIVE, APP_NAME, TEST_USERNAME_REGEX } from "../../modules/constants";

export const BASE_PATH = "/api/v1/integrations/";

export const PATH_REGEX = /\/api\/v1\/integrations*?/i;

export default function registerRoutes(app: Express, route: RouterFunction) {
    route({
        method: "get",
        path: BASE_PATH + "shopify/url",
        requireAuth: true,
        queryValidation: joi.object({
            shop_domain: joi.string().required(),
            redirect_url: joi.string().required(),
        }).unknown(true),
        handler: async function (req, res, next) {
            const url = req.validatedQuery.shop_domain;
            const redirect = req.validatedQuery.redirect_url;
            const isValidUrl = await Auth.isValidShopifyDomain(req.validatedQuery.shop_domain);

            if (!isValidUrl) {
                return next(boom.notAcceptable(`${url} is not a valid Shopify shop domain.`));
            }

            const authUrl = await Auth.buildAuthorizationUrl(DEFAULT_SCOPES, req.validatedQuery.shop_domain, SHOPIFY_API_KEY, redirect);

            res.json({ url: authUrl });

            return next();
        }
    });

    route({
        method: "post",
        path: BASE_PATH + "shopify/authorize",
        requireAuth: true,
        validateShopifyRequest: true,
        bodyValidation: joi.object({
            code: joi.string().required(),
            shop: joi.string().required(),
            hmac: joi.string().required(),
            state: joi.string()
        }).unknown(true),
        handler: async function (req, res, next) {
            const model = req.validatedBody as { code: string, shop: string, hmac: string, state?: string };
            let user: User;

            try {
                user = await users.get(req.user._id);
            } catch (e) {
                console.error(`Error getting user ${req.user._id} from database.`, e);

                return next(e);
            }

            const accessToken = await Auth.authorize(model.code, model.shop, SHOPIFY_API_KEY, SHOPIFY_SECRET_KEY);

            // Store the user's shop data
            user.shopify_domain = model.shop;
            user.shopify_access_token = accessToken;
            user.permissions = DEFAULT_SCOPES;

            try {
                const shop = await new Shops(model.shop, accessToken).get({ fields: "name,id" });

                user.shopify_shop_name = shop.name;
                user.shopify_shop_id = shop.id;
            } catch (e) {
                console.error(`Failed to get shop data from ${model.shop}`, e);
            }

            try {
                user = await users.put(user._id, user, user._rev);
            } catch (e) {
                console.error(`Failed to update user ${user._id}'s Shopify access token`, e);

                return next(e);
            }

            await res.withSessionToken(user);

            try {
                const db = new PromptLogDatabase(user.shopify_shop_id);

                await db.prepare()
            } catch (e) {
                inspect(`Failed to prepare user log database #${user.shopify_shop_id}`, e);
            }

            // Don't create any webhooks unless this app is running on a real domain. Webhooks cannot point to localhost.
            if (ISLIVE) {
                // Create the AppUninstalled webhook immediately after the user accepts installation
                const webhooks = new Webhooks(model.shop, accessToken);
                const existingHooks = await webhooks.list({ topic: "app/uninstalled", fields: "id", limit: 1 });

                // Ensure the webhook doesn't already exist
                if (existingHooks.length === 0) {
                    const hook = await webhooks.create({
                        address: req.domainWithProtocol + WEBHOOKS_BASE_PATH + `app-uninstalled?shop_id=${user.shopify_shop_id}`,
                        topic: "app/uninstalled"
                    })
                }
            }

            return next();
        }
    })

    route({
        method: "get",
        path: BASE_PATH + "shopify/plan/url",
        requireAuth: true,
        queryValidation: joi.object({
            plan_id: joi.string().only(Plans.map(p => p.id)).required(),
            redirect_path: joi.string().required(),
        }),
        handler: async function (req, res, next) {
            const api = new RecurringCharges(req.user.shopify_domain, req.user.shopify_access_token);
            const planId: string = req.validatedQuery.plan_id;
            const redirect = req.validatedQuery.redirect_path;
            const plan = findPlan(planId);
            const regex = new RegExp(TEST_USERNAME_REGEX);
            const charge = await api.create({
                trial_days: 0,
                name: `${APP_NAME} ${plan.name} plan`,
                capped_amount: plan.price_cap,
                price: undefined,
                terms: getPlanTerms(plan),
                test: !ISLIVE || regex.test(req.user._id),
                return_url: req.domainWithProtocol + redirect + `?${qs.stringify({ plan_id: plan.id })}`,
            });

            res.json({ url: charge.confirmation_url });

            return next();
        }
    })

    route({
        method: "get",
        path: BASE_PATH + "shopify/plan",
        requireAuth: true,
        handler: async function (req, res, next) {
            const api = new RecurringCharges(req.user.shopify_domain, req.user.shopify_access_token);
            const charge = await api.get(req.user.charge_id);

            res.json(charge);

            return next();
        }
    })

    route({
        method: "put",
        path: BASE_PATH + "shopify/plan",
        requireAuth: true,
        bodyValidation: joi.object({
            plan_id: joi.string().only(Plans.map(p => p.id)).required(),
            charge_id: joi.number().required(),
        }),
        handler: async function (req, res, next) {
            const model = req.validatedBody as ActivatePlanRequest;
            const plan = Plans.find(p => p.id === model.plan_id);

            const service = new RecurringCharges(req.user.shopify_domain, req.user.shopify_access_token);
            let charge: Models.RecurringCharge;

            try {
                charge = await service.get(model.charge_id);

                //Charges can only be activated when they've been accepted
                if (charge.status !== "accepted") {
                    return next(boom.expectationFailed(`Charge ${model.charge_id} has not been accepted.`));
                }
            } catch (e) {
                console.error("Recurring charge error", e);

                // Charge has expired or was declined. Send the user to select a new plan.
                return next(boom.expectationFailed("Could not find recurring charge. It may have expired or been declined."));
            }

            await service.activate(charge.id);

            // Update the user's planid
            let user = await users.get(req.user._id);
            user.plan_id = plan.id;
            user.charge_id = charge.id;

            try {
                user = await users.put(user._id, user, user._rev);
            } catch (e) {
                console.error(`Activated new subscription plan but failed to update user ${req.user._id}'s plan id.`, e);

                return next(e);
            }

            await res.withSessionToken(user);

            if (/^https/i.test(req.domainWithProtocol)) {
                const api = new ScriptTags(user.shopify_domain, user.shopify_access_token);
                const src = req.domainWithProtocol + "/dist/tag.js";

                try {
                    // First check if the script tag already exists
                    const tags = await api.list({
                        fields: "src"
                    });

                    if (!tags.some(t => t.src === src)) {
                        // Src must always be https
                        const tag = await api.create({ src: src.replace(/^https?/i, "https"), event: "onload" });
                    }
                } catch (e) {
                    inspect(`Failed to create script tag src ${src} for shop ${user.shopify_shop_id}`, e);
                }
            } else {
                console.warn(`Cannot create a Shopify script tag for a non-https URL (${req.domainWithProtocol}).`);
            }

            return next();
        }
    })
}
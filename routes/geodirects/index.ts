import * as joi from "joi";
import * as boom from "boom";
import * as cors from "cors";
import { Express } from "express";
import inspect from "../../modules/inspect";
import { findPlan } from "../../modules/plans";
import { RouterFunction, Geodirect } from "gearworks";
import { LogPromptRequest } from "gearworks/requests";
import { UsageCharges, RecurringCharges } from "shopify-prime";
import { geodirects, PromptLogDatabase, users } from "../../modules/database";

export const BASE_PATH = "/api/v1/geodirects/";

export const PATH_REGEX = /\/api\/v1\/geo-directs*?/i;

export default function registerRoutes(app: Express, route: RouterFunction) {
    route({
        method: "get",
        path: BASE_PATH,
        queryValidation: joi.object({
            shop_id: joi.number().required(),
        }),
        cors: true,
        requireAuth: false, // This route is also used by the tag script, where authentication is impossible.
        handler: async function (req, res, next) {
            const shop_id = req.validatedQuery.shop_id;
            const list = await geodirects.find({
                selector: {
                    shop_id: shop_id,
                }
            });

            res.json(list);

            return next();
        }
    })

    route({
        method: "get",
        path: BASE_PATH + ":id",
        requireAuth: true,
        paramValidation: joi.object({
            id: joi.string().required(),
        }),
        handler: async function (req, res, next) {
            const id: string = req.validatedParams.id;
            const geo = await geodirects.get(id);

            if (geo.shop_id !== req.user.shopify_shop_id) {
                return next(boom.notFound(`No geodirect with id of ${id} belonging to shop id ${req.user.shopify_shop_id}.`));
            }

            res.json(geo);

            return next();
        }
    })

    route({
        method: "post",
        path: BASE_PATH,
        requireAuth: true,
        bodyValidation: joi.object({
            _id: joi.any().strip(),
            _rev: joi.any().strip(),
            shop_id: joi.any().strip(),
            country: joi.string().length(2).required(),
            url: joi.string().uri().required(),
            message: joi.string().required(),
            hits: joi.any().strip(),
        }),
        handler: async function (req, res, next) {
            let geo: Geodirect = Object.assign({}, req.validatedBody, { shop_id: req.user.shopify_shop_id });
            geo = await geodirects.post(geo);

            res.json(geo);

            try {
                const db = new PromptLogDatabase(req.user.shopify_shop_id);

                await db.prepare()
            } catch (e) {
                inspect(`Failed to prepare user log database #${req.user.shopify_shop_id}`, e);
            }

            return next();
        }
    })

    route({
        method: "put",
        path: BASE_PATH + ":id",
        requireAuth: true,
        paramValidation: joi.object({
            id: joi.string().required(),
        }),
        bodyValidation: joi.object({
            _id: joi.any().strip(),
            _rev: joi.any().strip(),
            shop_id: joi.any().strip(),
            country: joi.string().length(2),
            url: joi.string().uri(),
            message: joi.string(),
            hits: joi.number(),
        }),
        handler: async function (req, res, next) {
            const id = req.validatedParams.id;
            const original = await geodirects.get(id)

            if (!original || original.shop_id !== req.user.shopify_shop_id) {
                return next(boom.notFound(`No geodirect with id of ${id} belongong to shop id ${req.user.shopify_shop_id}.`));
            }

            const geo = await geodirects.put(id, Object.assign({}, original, req.validatedBody, { _rev: undefined, _id: undefined }), original._rev);

            res.json(geo);

            return next();
        }
    })

    route({
        method: "delete",
        path: BASE_PATH + ":id",
        requireAuth: true,
        paramValidation: joi.object({
            id: joi.string().required(),
        }),
        handler: async function (req, res, next) {
            const id = req.validatedParams.id;
            const geo = await geodirects.get(id);

            if (geo.shop_id !== req.user.shopify_shop_id) {
                return next(boom.notFound(`No geodirect with id of ${id} belongong to shop id ${req.user.shopify_shop_id}.`));
            }

            await geodirects.delete(id, geo._rev);

            res.json({ success: true });

            return next();
        }
    })

    route({
        method: "post",
        path: BASE_PATH + ":id/log",
        requireAuth: false,
        cors: true,
        paramValidation: joi.object({
            id: joi.string().required(),
        }),
        bodyValidation: joi.object({
            shop_id: joi.number().required(),
            rev: joi.string().required(),
        }),
        handler: async function (req, res, next) {
            const {id} = req.validatedParams;
            const {shop_id, rev} = req.validatedBody as LogPromptRequest;
            const db = new PromptLogDatabase(shop_id);

            const log = await db.log({
                geodirect_id: id,
                geodirect_rev: rev,
                shop_id: shop_id,
                timestamp: Date.now()
            })

            res.json(log);

            try {
                const findUser = await users.find({
                    selector: {
                        shop_id: shop_id
                    }
                });
                const user = findUser[0];
                const plan = findPlan(user.plan_id);
                const recurringCharge = await (new RecurringCharges(user.shopify_domain, user.shopify_access_token).get(user.charge_id, {
                    fields: "billing_on"
                }))
                const timestamp = new Date(recurringCharge.billing_on).getTime() - (1000 * 60 * 60 * 24 * 30 /* 30 days */);
                const logsSinceTimestamp = await db.count(timestamp);

                if (logsSinceTimestamp > 100 && logsSinceTimestamp % 100 === 0) {
                    const charge = await (new UsageCharges(user.shopify_domain, user.shopify_access_token)).create(user.charge_id, {
                        price: plan.price_per_100,
                        description: "100 prompts shown to unique site visitors.",
                    });
                }
            } catch (e) {
                inspect(`Failed to create usage charge for shop #${shop_id}`, e);
            }

            return next();
        }
    })

    route({
        method: "get",
        path: BASE_PATH + "logs/count",
        requireAuth: true,
        queryValidation: joi.object({
            timestamp: joi.number()
        }),
        handler: async function (req, res, next) {
            const { timestamp } = req.validatedQuery;
            const db = new PromptLogDatabase(req.user.shopify_shop_id);
            const count = await db.count(timestamp);

            res.json({ count });

            return next();
        }
    })

    route({
        method: "get",
        path: BASE_PATH + "logs/count/by-geodirect",
        requireAuth: true,
        handler: async function (req, res, next) {
            const db = new PromptLogDatabase(req.user.shopify_shop_id);
            const count = await db.countByGeodirect();

            res.json(count);

            return next();
        }
    })
}
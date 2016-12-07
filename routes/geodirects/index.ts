import * as joi from "joi";
import * as boom from "boom";
import * as cors from "cors";
import { Express } from "express";
import inspect from "../../modules/inspect";
import { RouterFunction, Geodirect } from "gearworks";
import { LogPromptRequest } from "gearworks/requests";
import { geodirects, logs } from "../../modules/database";

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
            const body = req.validatedBody as LogPromptRequest;
            
            const log = await logs.post({
                geodirect_id: id,
                geodirect_rev: body.rev,
                shop_id: body.shop_id,
                timestamp: Date.now()
            });

            res.json(log);

            return next();
        }
    })
}
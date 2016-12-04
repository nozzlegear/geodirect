import * as joi from "joi";
import * as boom from "boom";
import { Express } from "express";
import inspect from "../../modules/inspect";
import { geodirects } from "../../modules/database";
import { RouterFunction, Geodirect } from "gearworks";

export const BASE_PATH = "/api/v1/geodirects/";

export const PATH_REGEX = /\/api\/v1\/geo-directs*?/i;

export default function registerRoutes(app: Express, route: RouterFunction) {
    route({
        method: "get",
        path: BASE_PATH,
        requireAuth: true,
        handler: async function (req, res, next) {
            const list = await geodirects.find({
                selector: {
                    shop_id: req.user.shopify_shop_id
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
                return next(boom.notFound(`No geodirect with id of ${id} belongong to shop id ${req.user.shopify_shop_id}.`));
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

            const geo = await geodirects.put(id, Object.assign({}, original, req.validatedBody, {_rev: undefined, _id: undefined}), original._rev);

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
}
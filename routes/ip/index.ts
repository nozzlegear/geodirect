import { Express } from "express";
import { RouterFunction } from "gearworks";
import { lookup } from "geoip-country-only";

export const BASE_PATH = "/api/v1/ip/";

export const PATH_REGEX = /\/api\/v1\/ip*?/i;

export default function registerRoutes(app: Express, route: RouterFunction) {
    route({
        method: "get",
        path: BASE_PATH,
        requireAuth: false,
        cors: true,
        handler: async function (req, res, next) {
            let countryIso: string;

            if (req.ip === "127.0.0.1") {
                console.log(`GET ${BASE_PATH}/country loaded over localhost. Defaulting country to 'US'.`);

                countryIso = "US";
            } else {
                const country = lookup(req.ip);

                countryIso = country && country.country || "";
            }

            res.json({ ip: req.ip, country: countryIso });

            return next();
        }
    })
}
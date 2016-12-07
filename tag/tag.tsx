// Import the fetch polyfill at the top of the application
try {
    const fetchPolyfill = require("whatwg-fetch");
} catch (e) {
    console.error(e);
}

// Libs
import * as qs from "qs";
import * as React from "react";
import * as DOM from "react-dom";

// Modules
import { Geodirects, IP } from "../modules/api";
import { ISLIVE, EMAIL_DOMAIN } from "../modules/constants";

// Components
import Prompt from "./prompt";

// Interfaces
import { Geodirect } from "gearworks";

async function start() {
    // All script tags are loaded with their ShopId in the querystring. Use that to parse the shop's id.
    const script: HTMLScriptElement = document.currentScript as any;
    let {shop_id} = qs.parse(window.location.search.replace(/^\?/i, "")) as { shop_id: number };

    if (!shop_id) {
        // Make a HEAD request to /admin and grab the X-ShopId header
        const result = await fetch("/admin", {
            method: "HEAD"
        });

        if (!result.ok) {
            console.error(`Script tag was not loaded with a shop id, and a HEAD request to /admin failed`, `${result.status} ${result.statusText}`);

            return;
        }

        const headers = result.headers;

        shop_id = parseInt(headers.get("X-ShopId"));
    }

    console.log("Listing Geodirects for shop id", shop_id);

    const domain = ISLIVE ? `https://${EMAIL_DOMAIN}` : `https://127.0.0.1:3001`;
    const getGeos = await fetch(`${domain}/api/v1/geodirects?shop_id=${shop_id}`, {
        method: "GET",
    });
    const getIp = await fetch(`${domain}/api/v1/ip`, {
        method: "GET",
    });

    if (!getGeos.ok) {
        const text = await getGeos.text();

        console.error(`Failed to list geodirects for shop id ${shop_id}. ${getGeos.status} ${getGeos.statusText}`, text);

        return;
    }

    if (!getIp.ok) {
        const text = await getIp.text();

        console.error(`Failed to get client IP address. ${getIp.status} ${getIp.statusText}`, text);

        return;
    }

    const geos: Geodirect[] = await getGeos.json();
    const ip = await getIp.json() as { ip: string, country: string };
    const matchedGeo = geos.find(g => g.country === ip.country);

    if (!matchedGeo) {
        console.log("No matching geodirects for visitor location", ip);

        return;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);

    DOM.render(<Prompt geodirect={matchedGeo} shop_id={shop_id} />, container);
}

start().catch(e => console.error("Geodirect script initialization failed", e));
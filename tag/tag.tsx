// Import the babel and fetch polyfills at the top of the application
const babelPolyfill = require("babel-polyfill");
const fetchPolyfill = require("whatwg-fetch");

import * as React from "react";
import * as DOM from "react-dom";
import * as qs from "qs";
import Prompt from "./prompt";

// Interfaces
import { Geodirect } from "gearworks";

async function start() {
    // All script tags are loaded with their ShopId in the querystring. Use that to parse the shop's id.
    const script: HTMLScriptElement = document.currentScript as any;
    const {shop_id} = qs.parse(window.location.search.replace(/^\?/i, "")) as { shop_id: string };

    console.log("Shop Id", shop_id);

    const container = document.createElement("div");
    document.body.appendChild(container);

    DOM.render(<Prompt />, container);
}

start().catch(e => console.error("Geodirect script initialization failed", e));
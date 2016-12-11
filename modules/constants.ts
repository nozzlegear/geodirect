import { resolve } from "path";
import { snakeCase } from "lodash";
import { Enums } from "shopify-prime";

// NODE_ENV is injected by webpack for the browser client.
declare const NODE_ENV: string;

const env = process && process.env || {};
let isBrowser = true;

if (typeof process === 'object' && process + '' === '[object process]') {
    isBrowser = false;
}

export const APP_NAME = "Geodirect";

function get(baseKey: string, defaultValue = undefined) {
    const snakedAppName = snakeCase(APP_NAME).toUpperCase();
    const snakedKey = snakeCase(baseKey).toUpperCase();

    return env[`${snakedAppName}_${snakedKey}`] || env[`GEARWORKS_${snakedKey}`] || env[snakedKey] || defaultValue;
}

export const COUCHDB_URL = get("COUCHDB_URL", "http://localhost:5984");

export const JWT_SECRET_KEY = get("JWT_SECRET_KEY");

export const IRON_PASSWORD = get("IRON_PASSWORD");

export const EMAIL_DOMAIN: string = get("EMAIL_DOMAIN");

export const SPARKPOST_API_KEY = get("SPARKPOST_API_KEY");

export const SHOPIFY_API_KEY = get("SHOPIFY_API_KEY");

export const SHOPIFY_SECRET_KEY = get("SHOPIFY_SECRET_KEY");

export const ISLIVE = env.NODE_ENV === "production" || (isBrowser && NODE_ENV === "production");

export const AUTH_HEADER_NAME = "x-gearworks-token";

/**
 * Localstorage key for logging when a user dismisses a prompt without navigating.
 */
export const PROMPT_DISMISSED_KEY = `${APP_NAME}_Prompt_Dismissed`;

/**
 * Localstorage key for logging when a user has been shown a prompt.
 */
export const PROMPT_SHOWN_KEY = `${APP_NAME}_Prompt_Shown`;

/**
 * A list of Shopify authorization scopes that will be requested from the user during app installation.
 */
export const DEFAULT_SCOPES: Enums.AuthScope[] = ["write_script_tags"];

/**
 * A list of properties on a user or sessiontoken object that will be automatically sealed and unsealed by Iron.
 */
export const SEALABLE_USER_PROPERTIES = ["shopify_access_token"];

if (!isBrowser) {
    if (!JWT_SECRET_KEY) {
        console.warn("Warning: JWT_SECRET_KEY was not found in environment variables. Session authorization will be unsecure and may exhibit unwanted behavior.");
    }

    if (!IRON_PASSWORD) {
        console.warn("Warning: IRON_PASSWORD was not found in environment variables. Session authorization will be unsecure and may exhibit unwanted behavior.");
    }

    if (!SHOPIFY_API_KEY) {
        console.warn("Warning: SHOPIFY_API_KEY was not found in environment variables. Shopify integration will be impossible.");
    }

    if (!SHOPIFY_SECRET_KEY) {
        console.warn("Warning: SHOPIFY_SECRET_KEY was not found in environment variables. Shopify integration will be impossible.");
    }

    if (!EMAIL_DOMAIN) {
        console.warn("Warning: EMAIL_DOMAIN was not found in environment varialbes. Password reset will be impossible.")
    }

    if (!SPARKPOST_API_KEY) {
        console.warn("Warning: SPARKPOST_API_KEY was not found in environment variables. Password reset will be impossible.");
    }
}
declare module "geoip-country-only" {
    export interface Result {
        /**
         * Low bound and high bound of the IP block.
         */
        range: string[];
        /** 
         * 2 letter ISO-3166-1 country code 
         */
        country: string;
    }
    /**
     * Looks up the country for the given IP. Returns null if no result is found.
     */
    export function lookup (ip: string): Result;
    /**
     * Turn an IP into a human-readable string.
     */
    export function pretty(ip: string): string;
}
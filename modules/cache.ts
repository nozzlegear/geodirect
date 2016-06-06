/// <reference path="./../typings/typings.d.ts" />

import * as Promise from "bluebird";
import {DatabaseUrl} from "./database";
import {Server, CacheConfig} from "gearworks";
import {Client, CachePolicy, CachedItem} from "catbox";

export const CacheName = "catbox-couchbase";
export const DefaultTTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * A collection of caches used throughout the app.
 */
export const Caches: {sessionInvalidation: CacheConfig} = {
    /**
     * A cache to store ids of users who must be forced to login on the next auth check. 
     */
    sessionInvalidation: {
        segment: "invalidations",
        client: undefined,
        defaultTTL: DefaultTTL,
    }
}

/**
 * Registers caches on the server and makes them available on the Caches object.
 */
export async function registerCaches(server: Server)
{
    Caches.sessionInvalidation.client = new Client(require("catbox-memory"), undefined);
    Caches.sessionInvalidation.client.start(async (error) =>
    {
        if (error)
        {
            console.error("Error starting cache client", error);
            
            throw error;
        }
    })
}

/**
 * A promised function for getting a value from a catbox cache.
 */
export function getCacheValue<T>(cache: CacheConfig, key: string)
{
    return new Promise<CachedItem<T>>((resolve, reject) =>
    {
        cache.client.get<T>({id: key, segment: cache.segment}, (error, value) =>
        {
            if (error)
            { 
                return reject (error);
            }
            
            return resolve(value);
        })
    })
}

/**
 * A promised function for setting a value in a catbox cache.
 */
export function setCacheValue<T>(cache: CacheConfig, key: string, value: T)
{
    return new Promise<void>((resolve, reject) =>
    {
        cache.client.set({id: key, segment: cache.segment}, value, cache.defaultTTL, (error) =>
        {
            if (error)
            {
                reject(error);
            }
            
            resolve(undefined);
        })
    })
}

/**
 * A promised function for deleting a value in a catbox cache.
 */
export function deleteCacheValue<T>(cache: CacheConfig, key: string)
{
    return new Promise<void>((resolve, reject) =>
    {
        cache.client.drop({id: key, segment: cache.segment}, (error) =>
        {
            if (error)
            {
                reject(error);
            }
            
            resolve(undefined);
        });
    })
}
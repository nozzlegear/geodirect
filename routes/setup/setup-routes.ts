/// <reference path="./../../typings/typings.d.ts" />

import * as joi from "joi";
import * as boom from "boom";
import * as pouch from "pouchdb";
import {Request, IReply} from "hapi";
import {Server, User} from "gearworks";
import {IProps as SetupProps} from "../../views/setup/setup";

export function registerRoutes(server: Server)
{
    server.route({
        method: "GET",
        path: "/setup",
        handler: {
            async: (request, reply) => getSetupForm(server, request, reply)
        }
    });
}

export async function getSetupForm(server: Server, request: Request, reply: IReply)
{
    const props: SetupProps = {
        title: "Connect your Shopify store.",  
    };
    
    return reply.view("setup/setup.js", props);
}
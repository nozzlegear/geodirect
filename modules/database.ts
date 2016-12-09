import { wrap } from "boom";
import inspect from "./inspect";
import { stringify as qs } from "qs";
import fetch, { Response } from "node-fetch";
import { snakeCase, isUndefined } from "lodash";
import { COUCHDB_URL, APP_NAME } from "../modules/constants";
import {
    User,
    Database,
    CouchResponse,
    ViewOptions,
    CouchDoc,
    Geodirect,
    LoggedPrompt,
    ListResponse,
    CouchDBView,
    DesignDoc,
} from "gearworks";

// CouchDB view functions
import * as CountByTimestamp from "../couchdb/count-by-timestamp";
import * as CountGroupedByGeodirects from "../couchdb/count-grouped-by-geodirects";

const UsersDatabaseInfo = {
    name: `${snakeCase(APP_NAME)}_users`,
    indexes: ["shopify_access_token", "password_reset_token", "shop_id"],
    views: [],
};

const GeodirectsDatabaseInfo = {
    name: `${snakeCase(APP_NAME)}_geodirections`,
    indexes: ["shop_id"],
    views: [],
}

export default async function configureDatabases() {
    const dbInfo = await fetch(COUCHDB_URL, { method: "GET" });

    if (!dbInfo.ok) {
        throw new Error(`Failed to connect to CouchDB instance at ${COUCHDB_URL}. ${dbInfo.status} ${dbInfo.statusText} ${await dbInfo.text()}`);
    }

    const infoBody = await dbInfo.json();
    const version = parseInt(infoBody.version);

    if (version < 2) {
        console.warn(`Warning: Gearworks expects your CouchDB instance to be running CouchDB 2.0 or higher. Version detected: ${version}. Some database methods may not work.`)
    }

    [UsersDatabaseInfo, GeodirectsDatabaseInfo].forEach(async db => await configureDatabase(db));
}

export async function configureDatabase(db: { name: string, indexes: string[], views: ({ designDocName: string, viewName: string } & CouchDBView)[] }) {
    try {
        const result = await fetch(`${COUCHDB_URL}/${db.name}`, { method: "PUT" });

        if (!result.ok && result.status !== 412 /* Precondition Failed - Database already exists. */) {
            const body = await result.text();

            throw new Error(`${result.status} ${result.statusText} ${body}`);
        }
    } catch (e) {
        console.error(`Error creating database ${db.name}`, e);

        return;
    }

    try {
        const result = await fetch(`${COUCHDB_URL}/${db.name}/_index`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                index: {
                    fields: db.indexes
                },
                name: `${db.name}-indexes`,
            })
        });

        if (!result.ok) {
            const body = await result.text();

            throw new Error(`${result.status} ${result.statusText} ${body}`);
        }
    } catch (e) {
        console.error(`Error creating indexes (${db.indexes}) on database ${db.name}`, e);
    }

    db.views.forEach(async view => {
        const url = `${COUCHDB_URL}/${db.name}/_design/${view.designDocName}`;
        const getDoc = await fetch(url, { method: "GET" });
        let doc: DesignDoc;

        if (!getDoc.ok && getDoc.status !== 404) {
            inspect(`Failed to retrieve design doc "${view.designDocName}". ${getDoc.status} ${getDoc.statusText}`, await getDoc.text());

            return;
        } else if (!getDoc.ok) {
            doc = {
                _id: `_design/${view.designDocName}`,
                language: "javascript",
                views: { }
            }
        } else {
            doc = await getDoc.json();
        } 

        if (!doc.views[view.viewName] || doc.views[view.viewName].map !== view.map || doc.views[view.viewName].reduce !== view.reduce) {
            doc.views[view.viewName] = {
                map: view.map,
                reduce: view.reduce,
            }
            
            const method = "put";
            const result = await fetch(url, {
                method,
                body: JSON.stringify(doc),
                headers: {
                    "Content-Type": "application/json",
                }
            });
            const text = await result.text();

            if (!result.ok) {
                inspect(`Could not ${method} CouchDB design doc "${view.designDocName}". ${result.status} ${result.statusText}`, text);
                inspect(doc);
            }
        }
    })
}

function prepDatabase<T extends CouchDoc>(name: string) {
    const databaseUrl = `${COUCHDB_URL}/${name}/`;
    async function checkErrorAndGetBody(result: Response, action: "finding" | "listing" | "counting" | "getting" | "posting" | "putting" | "deleting" | "copying" | "viewing") {
        const body = await result.json();

        if (!result.ok) {
            const message = `Error ${action} document(s) for CouchDB database ${name} at ${result.url}. ${result.status} ${result.statusText}`;

            if (result.status !== 404) {
                console.error(message, body)
            }

            throw wrap(new Error(message), result.status, message);
        }

        return body;
    };

    const output: Database<T> = {
        find: async function (selector) {
            const result = await fetch(`${databaseUrl}/_find`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(selector)
            });

            const body = await checkErrorAndGetBody(result, "finding");

            if (body.warning) {
                console.warn(body.warning);
            }

            return body.docs;
        },
        list: async function (options = {}) {
            options = Object.assign({ design_doc_name: "list" }, )
            const query = qs(Object.assign({ include_docs: true }, options));
            const url = databaseUrl + `_all_docs`;
            const result = await fetch(`${url}?${query}`, {
                method: "GET",
            });

            const body = await checkErrorAndGetBody(result, "listing");

            return { offset: body.offset, rows: body.rows.map((r: { id: string, key: string, value: { rev: string }, doc: T }) => r.doc), total_rows: body.total_rows };
        },
        count: async function () {
            const result = await fetch(databaseUrl + `_all_docs`, {
                method: "GET",
            });

            const body = await checkErrorAndGetBody(result, "counting");

            return body.total_rows;
        },
        get: async function (id, rev?) {
            const result = await fetch(databaseUrl + id + "?" + qs({ rev }), {
                method: "GET",
            });

            const body = await checkErrorAndGetBody(result, "getting");

            return body;
        },
        post: async function (data) {
            const result = await fetch(databaseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const body: CouchResponse = await checkErrorAndGetBody(result, "posting");

            // Post, put and copy requests do not return the object itself. Update the input object with new id and rev values.
            return Object.assign({}, data, { _id: body.id, _rev: body.rev });
        },
        put: async function (id: string, data, rev: string) {
            const result = await fetch(databaseUrl + id + `?${qs({ rev })}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const body: CouchResponse = await checkErrorAndGetBody(result, "putting");

            // Post, put and copy requests do not return the object itself. Update the input object with new id and rev values.
            return Object.assign({}, data, { _id: body.id, _rev: body.rev });
        },
        copy: async function (id: string, data, newId) {
            const result = await fetch(databaseUrl + id, {
                method: "COPY",
                headers: {
                    Destination: newId
                },
            })

            const body: CouchResponse = await checkErrorAndGetBody(result, "copying");

            // Post, put and copy requests do not return the object itself. Update the input object with new id and rev values.
            return Object.assign({}, data, { _id: body.id, _rev: body.rev });
        },
        delete: async function (id, rev) {
            const result = await fetch(databaseUrl + id + `?${qs({ rev })}`, {
                method: "DELETE",
            });

            await checkErrorAndGetBody(result, "deleting");
        },
        exists: async function (id) {
            const result = await fetch(databaseUrl + id, {
                method: "HEAD",
            });

            return result.status === 200;
        },
        view: async function (designDocName: string, viewName: string, options: ViewOptions = {}) {
            if (options.reduce === true) {
                console.warn("CouchDB .reducedView was passed {reduce: true} with its options. This function always sets reduce to false. Consider using CouchDB .reducedView instead.");
            }

            options.reduce = false;

            const result = await fetch(`${databaseUrl}_design/${designDocName}/_view/${viewName}?${qs(options)}`, {
                method: "GET",
            })

            const body = await checkErrorAndGetBody(result, "viewing");

            return body;
        },
        reducedView: async function (designDocName: string, viewName: string, options: ViewOptions = {}) {
            if (options.reduce === false) {
                console.warn("CouchDB .reducedView was passed {reduce: false} with its options. This function always sets reduce to true. Consider using CouchDB .view instead.");
            }

            if (!options.group && isUndefined(options.group_level)) {
                console.warn("CouchDB .reducedView is not grouping its results. This may not return the desired result. Consider using {group: true} or {group_level: 1}");
            }

            options.reduce = true;

            const result = await fetch(`${databaseUrl}_design/${designDocName}/_view/${viewName}?${qs(options)}`, {
                method: "GET",
            })

            const body = await checkErrorAndGetBody(result, "viewing");

            return body;
        }
    };

    return output;
}

export const users = prepDatabase<User>(UsersDatabaseInfo.name);
export const geodirects = prepDatabase<Geodirect>(GeodirectsDatabaseInfo.name);

export class PromptLogDatabase {
    constructor(private shop_id: number) {
        this.database_name = `${snakeCase(APP_NAME)}_shop_${this.shop_id}_logs`;
        this.database = prepDatabase<LoggedPrompt>(this.database_name);
    }

    private database_name: string;

    private database: Database<LoggedPrompt>;

    private get COUNT_BY_TIMESTAMP_VIEWNAME() {
        return "count-by-timestamp";
    }

    private get COUNT_GROUPED_BY_GEODIRECTS_VIEWNAME() {
        return "count-grouped-by-geodirects";
    }

    /**
     * Prepares the log database by creating it and adding required view documents.
     */
    public async prepare() {
        await configureDatabase({
            name: this.database_name,
            indexes: [],
            views: [
                {
                    designDocName: "list",
                    viewName: this.COUNT_BY_TIMESTAMP_VIEWNAME,
                    map: CountByTimestamp.map.toString(),
                    reduce: CountByTimestamp.reduce.toString(),
                },
                {
                    designDocName: "list",
                    viewName: this.COUNT_GROUPED_BY_GEODIRECTS_VIEWNAME,
                    map: CountGroupedByGeodirects.map.toString(),
                    reduce: CountGroupedByGeodirects.reduce.toString(),
                },
            ]
        })
    }

    /**
     * Logs a new Geodirect prompt.
     */
    public async log(log: LoggedPrompt) {
        return await this.database.post(log);
    }

    /**
     * Counts all logs created on or after the given timestamp.
     */
    public async count(since_timestamp: number) {
        const result = await this.database.view("list", "count-by-timestamp", { start_key: since_timestamp });

        return result.total_rows;
    }

    /**
     * Counts all logs, grouped by their Geodirect id.
     */
    public async countByGeodirect() {
        const result = await this.database.view("list", "count-grouped-by-geodirects", { group: true });
    }
}
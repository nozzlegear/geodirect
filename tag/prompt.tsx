// Material-UI needs the react-tap-event-plugin activated
const injectTapEventPlugin = require("react-tap-event-plugin");
injectTapEventPlugin();

// Libs
import * as React from 'react';
import Countries from "typed-countries";
import { Dialog, RaisedButton } from "material-ui";
import { MuiThemeProvider } from "material-ui/styles";

// Modules
import { APP_NAME, ISLIVE, EMAIL_DOMAIN, PROMPT_DISMISSED_KEY, PROMPT_SHOWN_KEY } from "../modules/constants";

// Interfaces
import { Geodirect, LoggedPrompt } from "gearworks";
import { LogPromptRequest } from "gearworks/requests";

export interface IProps extends React.Props<any> {
    geodirect: Geodirect;
    shop_id: number;
}

export interface IState {
    open?: boolean;
}

export default class Prompt extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.configureState(props, false);
    }

    public state: IState = {};

    //#region Utility functions

    private configureState(props: IProps, useSetState: boolean) {
        let state: IState = {
            open: false,
        }

        if (!useSetState) {
            this.state = state;

            return;
        }

        this.setState(state);
    }

    private shouldLogPrompt() {
        const loggedDataString = localStorage.getItem(PROMPT_SHOWN_KEY);

        if (!loggedDataString) {
            return true;
        }

        const loggedData = JSON.parse(loggedDataString || "{}") as LoggedPrompt;
        const olderThan30Days = (Date.now() - loggedData.timestamp) > 1000 * 60 * 60 * 24 * 30 /* 30 days in milliseconds */;

        return olderThan30Days;
    }

    //#endregion

    private dismiss() {
        localStorage.setItem(PROMPT_DISMISSED_KEY, JSON.stringify({ timestamp: Date.now() }));

        this.setState({ open: false });
    }

    private navigate() {
        const url = this.props.geodirect.url.replace(/^https?:\/\//i, "");
        const protocol = "https://";

        if (/\/./i.test(url)) {
            // URL points to a specific path. Send the user directly there
            window.location.href = protocol + url;
        } else {
            // URL points to a base domain. Preserve the user's path.
            const href = `${url}/${window.location.pathname}`.replace(/\/\//i, "/") + window.location.search;

            window.location.href = protocol + href;
        }
    }

    public componentDidMount() {
        if (!!localStorage.getItem(PROMPT_DISMISSED_KEY)) {
            console.log(`${APP_NAME}: User has previously dismissed this prompt. Will not show again.`);

            return;
        }

        const {geodirect, shop_id} = this.props;
        const targetDomain = this.props.geodirect.url.replace(/^https?:\/\//i, "").replace(/\/.*/i, "");
        const currentDomain = window.location.href.replace(/^https?:\/\//i, "").replace(/\/.*/i, "");

        if (targetDomain.toLowerCase() === currentDomain.toLowerCase()) {
            console.log(`${APP_NAME}: User is already on the target domain.`);

            return;
        }

        this.setState({ open: true }, async () => {
            if (this.shouldLogPrompt()) {
                const logRequest: LogPromptRequest = {
                    shop_id,
                    rev: geodirect._rev,
                }
                const result = await fetch(`https://${ISLIVE ? EMAIL_DOMAIN : "127.0.0.1:3001"}/api/v1/geodirects/${geodirect._id}/log`, {
                    method: "POST",
                    body: JSON.stringify(logRequest),
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                const text = await result.text();

                if (!result.ok) {
                    console.error(`${APP_NAME}: Failed to log prompt trigger. ${result.status} ${result.statusText}`, text);

                    return;
                }

                localStorage.setItem(PROMPT_SHOWN_KEY, text);
            }
        });
    }

    public componentDidUpdate() {

    }

    public componentWillReceiveProps(props: IProps) {
        this.configureState(props, true);
    }

    public render() {
        const geo = this.props.geodirect;
        const {open} = this.state;
        const country = Countries.find(c => c.iso === geo.country);
        const actions = [
            <RaisedButton key="geo-close" label="Close" onClick={e => this.dismiss()} style={{ float: "left" }} />,
            <RaisedButton key="geo-go" label="Okay" onClick={e => this.navigate()} primary={true} />,
        ]

        return (
            <MuiThemeProvider>
                <Dialog open={open} title={`Looks like you're visiting from ${geo.country}.`} actions={actions}>
                    <p>{geo.message}</p>
                </Dialog>
            </MuiThemeProvider>
        );
    }
}
import * as React from 'react';
import { Link } from "react-router";
import * as classes from "classnames";
import Box from "../../components/box";
import { SessionToken } from "gearworks";
import AuthStore from "../../stores/auth";
import Router from "../../components/router";
import { RaisedButton, FontIcon } from "material-ui";
import { APP_NAME } from "../../../modules/constants";
import { ApiError, Users, Shopify } from "../../../modules/api";
import Plans, { findPlan, getPlanTerms } from "../../../modules/plans";

export interface IProps {

}

export interface IState {
    loading?: boolean;
    error?: string;
}

export default class SelectPlanPage extends Router<IProps, IState> {
    constructor(props: IProps, context) {
        super(props, context);

        this.configureState(props, false);
    }

    public state: IState = {};

    //#region Utility functions

    private configureState(props: IProps, useSetState: boolean) {
        let state: IState = {
            
        }

        if (!useSetState) {
            this.state = state;

            return;
        }

        this.setState(state);
    }

    //#endregion

    private async selectPlan(e: React.MouseEvent<any> | React.FormEvent<any>) {
        e.preventDefault();

        if (this.state.loading) {
            return;
        }

        const plan = Plans[0];

        await this.setStateAsync({ loading: true, error: undefined });

        try {
            const api = new Shopify(AuthStore.token);
            const url = await api.createPlanUrl({plan_id: plan.id, redirect_path: this.PATHS.plans.select})

            window.location.href = url.url;
        }
        catch (e) {
            const err: ApiError = e;

            if (err.unauthorized && this.handleUnauthorized()) {
                return;
            }

            this.setState({ loading: false, error: err.message });

            return;
        }
    }

    public componentDidMount() {

    }

    public componentDidUpdate() {

    }

    public componentWillReceiveProps(props: IProps) {
        this.configureState(props, true);
    }

    public render() {
        const {loading, error} = this.state;
        const plan = Plans[0];
        const styles = {
            p: {
                fontSize: "1.7rem",
            },
            container: {
                margin: "5rem 0",
            }
        }
        const actions = (
            <RaisedButton
                fullWidth={true}
                primary={true}
                onTouchTap={e => this.selectPlan(e)}
                label={loading ? "Getting things ready" : "Okay, I'm ready to begin!"}
                icon={loading ? <FontIcon className="fa fa-spinner fa-spin" /> : null} />);

        return (
            <section id="signup">
                <div className="pure-g center-children">
                    <div className="pure-u-1-1 pure-u-md-12-24">
                        <Box title={`How does the billing work?`} footer={actions} error={error}>
                            <div style={styles.container}>
                                <p className="lead" style={styles.p}>
                                    {"When a visitor matching one of your redirection rules lands on your website, Geodirect will show a prompt asking if they want to visit the URL you specify. From then on, that visitor will only count as one single prompt, no matter how many times they visit your site afterwards."}
                                </p>
                                <p className="lead" style={styles.p}>
                                    {`${getPlanTerms(plan)}, to a maximum of $${plan.price_cap.toFixed(2)} USD. You can cancel your plan at any time, with no questions asked. All you have to do is uninstall the app from your Shopify admin dashboard.`}
                                </p>
                            </div>
                        </Box>
                    </div>
                </div>
            </section>
        );
    }
}
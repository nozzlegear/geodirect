import * as React from 'react';
import { Link } from "react-router";
import * as classes from "classnames";
import Box from "../../components/box";
import { SessionToken } from "gearworks";
import AuthStore from "../../stores/auth";
import Paths from "../../../modules/paths";
import Router from "../../components/router";
import { RaisedButton, FontIcon } from "material-ui";
import { APP_NAME } from "../../../modules/constants";
import Plans, { findPlan } from "../../../modules/plans";
import { ApiError, Users, Shopify } from "../../../modules/api";

export interface IProps {

}

export interface IState {
    loading?: boolean;
    error?: string;
    selectedPlanId?: string;
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
            selectedPlanId: Plans[1].id
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

        const plan = findPlan(this.state.selectedPlanId);

        if (plan.price === 0) {
            console.warn("TODO: Select free plan via /users API.");

            // AuthStore.login(token);
            // this.context.router.push(this.PATHS.home.index);

            return;
        }

        await this.setStateAsync({ loading: true, error: undefined });

        try {
            const api = new Shopify(AuthStore.token);
            const url = await api.createPlanUrl({plan_id: plan.id, redirect_path: Paths.plans.select})

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
        const {loading, error, selectedPlanId} = this.state;
        const plan = findPlan(selectedPlanId);
        let btnMessage: string;

        if (loading) {
            btnMessage = plan.price === 0 ? `Starting your free subscription` : `Starting your ${plan.trialDays}-day free trial`;
        } else {
            btnMessage = plan.price === 0 ? `Start my free subscription!` : `Start my ${plan.trialDays}-day free trial!`;
        }

        const actions = (
            <RaisedButton
                fullWidth={true}
                primary={true}
                onTouchTap={e => this.selectPlan(e)}
                label={btnMessage}
                icon={loading ? <FontIcon className="fa fa-spinner fa-spin" /> : null} />);

        return (
            <section id="signup">
                <div className="pure-g center-children">
                    <div className="pure-u-12-24">
                        <Box title={`Start your free ${APP_NAME} trial.`} description={"When a visitor matching one of your redirection rules lands on your website, Geodirect will show a prompt asking if they want to visit the URL you specify. From then on, that visitor will only count as one single prompt, no matter how many times they visit your site afterwards."} footer={actions} error={error}>
                            <div className="pure-g">
                                {Plans.map(plan =>
                                    <div key={plan.id} className="pure-u-8-24">
                                        <div className={classes("box pricing no-shadow", { selected: plan.id === this.state.selectedPlanId })} onClick={e => this.setState({ selectedPlanId: plan.id, error: undefined })}>
                                            <h3>{plan.limit === 0 ? `Unlimited.` : `${plan.limit} prompts.`}</h3>
                                            <p>{plan.price === 0 ? "Free" : `$${plan.price}/month`}</p>
                                            <input type="radio" checked={plan.id === this.state.selectedPlanId} readOnly={true} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-center">{"All paid plans come with a 21-day free trial."}</p>
                        </Box>
                    </div>
                </div>
            </section>
        );
    }
}
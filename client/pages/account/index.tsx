import Dialog from "./dialog";
import * as React from 'react';
import { Plan } from "gearworks";
import * as gravatar from "gravatar";
import { observer } from "mobx-react";
import { Models } from "shopify-prime";
import Observer from "../../components/observer";
import { APP_NAME } from "../../../modules/constants";
import { Shopify, Geodirects, ApiError } from "../../../modules/api";
import Plans, { findPlan, getPlanDescription } from "../../../modules/plans";
import {
    Card,
    CardHeader,
    CardText,
    CardActions,
    RaisedButton,
    TextField,
} from "material-ui";

export interface IProps {

}

export interface IState {
    emailDialogOpen?: boolean;
    passwordDialogOpen?: boolean;
    planDialogOpen?: boolean;
    charge?: Models.RecurringCharge;
    planError?: string;
    loading?: boolean;
    hitsThisMonth?: number;
}

@observer(["auth"])
export default class AccountPage extends Observer<IProps, IState> {
    constructor(props: IProps, context) {
        super(props, context);

        this.configureState(props, false);
    }

    public state: IState = {};

    private planBox: HTMLSelectElement;

    //#region Utility functions

    private configureState(props: IProps, useSetState: boolean) {
        let state: IState = {
            loading: true,
        }

        if (!useSetState) {
            this.state = state;

            return;
        }

        this.setState(state);
    }

    //#endregion

    private async changePlan() {

    }

    private async refreshData() {
        await this.setStateAsync({ loading: true });

        const shopifyApi = new Shopify(this.props.auth.token);
        const logApi = new Geodirects(this.props.auth.token);

        try {
            const charge = await shopifyApi.getPlanDetails();
            const timestamp = new Date(charge.billing_on).getTime() - (1000 * 60 * 60 * 24 * 30 /* 30 days in milliseconds */);
            const hitsThisMonth = await logApi.countLogs({ timestamp })

            await this.setStateAsync({ charge, hitsThisMonth: hitsThisMonth.count, loading: false, });
        } catch (e) {
            const err: ApiError = e;

            if (err.unauthorized && this.handleUnauthorized(this.PATHS.account.index)) {
                return;
            }

            this.setState({ planError: err.message });
        }
    }

    public async componentDidMount() {
        this.refreshData();
    }

    public componentDidUpdate() {

    }

    public componentWillReceiveProps(props: IProps) {
        this.configureState(props, true);
        this.refreshData();
    }

    private BillingCardBody() {
        const plan = findPlan(this.props.auth.session.plan_id);
        const { charge, planError, loading } = this.state;
        let body: JSX.Element;

        if (loading) {
            body = (
                <div className="text-center" style={{ "padding": "4rem 0" }}>
                    <i className="fa fa-spinner fa-spin fa-4x color" />
                    <p>{"Loading billing information, please wait."}</p>
                </div>
            )
        } else {
            body = (
                <div>
                    <p className="underline">
                        {"Billing To"}
                        <span>{"Your Shopify Account"}</span>
                    </p>
                    <p className="underline">
                        {"Next Charge"}
                        <span>{new Date(charge.billing_on).toLocaleDateString()}</span>
                    </p>
                    <p className="underline">
                        {"Prompts This Month"}
                        <span>{this.state.hitsThisMonth}</span>
                    </p>
                    <p className="underline">
                        {"Charges This Month"}
                        <span>{`$${charge.balance_used.toFixed(2)} USD`}</span>
                    </p>
                    <p>
                        {`To cancel your subscription, just uninstall the ${APP_NAME} app from your Shopify admin dashboard.`}
                    </p>
                </div>
            )
        }

        return (
            <Card>
                <CardHeader title={`${APP_NAME} ${plan.name} Plan`} avatar={"/images/shopify.png"} subtitle={getPlanDescription(plan)} />
                <CardText>
                    {body}
                    {planError ? <p className="error">{planError}</p> : null}
                </CardText>
            </Card>
        )
    }


    public render() {
        const {emailDialogOpen, passwordDialogOpen, planDialogOpen} = this.state;
        const auth = this.props.auth.session;
        const plan = findPlan(auth.plan_id);

        return (
            <div>
                <section id="account" className="content">
                    <h2 className="content-title">{"Your Account"}</h2>
                    <div className="pure-g">
                        <div className="pure-u-1-1 pure-u-md-11-24">
                            <Card>
                                <CardHeader title={auth.shopify_shop_name} subtitle={auth._id} avatar={gravatar.url(auth._id)} />
                                <CardText>
                                    <div className="underline">
                                        <div className="pure-u-9-24">
                                            {"Date Created:"} 
                                        </div>
                                        <div className="pure-u-15-24 ellipsis text-right">
                                            {new Date(auth.date_created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </div>
                                    </div>
                                    <div className="underline">
                                        <div className="pure-u-8-24">
                                            {"Shop URL:"}
                                        </div>
                                        <div className="pure-u-16-24 ellipsis text-right">
                                            {auth.shopify_domain}
                                        </div>
                                    </div>
                                </CardText>
                                <CardActions>
                                    <RaisedButton label="Change Login Email" style={{marginBottom: "1rem"}} onTouchTap={e => this.setState({ emailDialogOpen: true })} />
                                    <RaisedButton label="Change Login Password" className="sm-float-right" onTouchTap={e => this.setState({ passwordDialogOpen: true })} />
                                </CardActions>
                            </Card>
                        </div>
                        <div className="pure-u-1-1 pure-u-md-2-24" />
                        <div className="pure-u-1-1 pure-u-md-11-24">
                            {this.BillingCardBody()}
                        </div>
                    </div>
                    <Dialog open={emailDialogOpen} type="email" onRequestClose={() => this.setState({ emailDialogOpen: false })} />
                    <Dialog open={passwordDialogOpen} type="password" onRequestClose={() => this.setState({ passwordDialogOpen: false })} />
                </section>
            </div>
        );
    }
}
import * as React from 'react';
import { theme } from "../../app";
import { observer } from "mobx-react";
import { Geodirect } from "gearworks";
import { Models } from "shopify-prime";
import Dialog from "./geodirect_dialog";
import { truncate, range } from "lodash";
import Paths from "../../../modules/paths";
import Observer from "../../components/observer";
import { Region, countries } from "typed-countries";
import AddIcon from "material-ui/svg-icons/content/add";
import { Geodirects, ApiError } from "../../../modules/api";
import DeleteIcon from "material-ui/svg-icons/action/delete";
import SelectAllIcon from "material-ui/svg-icons/content/select-all";
import {
    CircularProgress,
    MenuItem,
    Snackbar,
    RaisedButton,
    IconButton,
} from "material-ui";
import {
    Table,
    TableBody,
    TableHeader,
    TableRow as TR,
    TableHeaderColumn as TH,
    TableRowColumn as TD
} from "material-ui/Table";

export interface IProps {

}

export interface IState {
    loading?: boolean;
    error?: string;
    dialogOpen?: boolean;
    geodirects?: Geodirect[];
    selectedRows?: string | number[];
}

@observer(["auth"])
export default class HomePage extends Observer<IProps, IState> {
    constructor(props: IProps, context) {
        super(props, context);

        this.configureState(props, false);
    }

    public state: IState;

    //#region Utility functions

    private configureState(props: IProps, useSetState: boolean) {
        let state: IState = {
            loading: true,
            geodirects: [],
        }

        if (!useSetState) {
            this.state = state;

            return;
        }

        this.setState(state);
    }

    //#endregion

    private closeErrorSnackbar(reason: "timeout" | "clickaway" | string) {
        // Only hide the snackbar if its duration has expired. This prevents clicking anywhere on the app
        // and inadvertantly closing the snackbar.
        if (reason === "timeout") {
            this.setState({ error: undefined });
        }
    }

    private async closeDialog(geo?: Geodirect) {
        const geos = this.state.geodirects;

        if (geo) {
            const index = geos.findIndex(g => g._id === geo._id);

            if (index > -1) {
                geos[index] = geo;
            } else {
                geos.push(geo);
            }
        }

        this.setState({ dialogOpen: false, geodirects: geos });
    }

    public async componentDidMount() {
        const api = new Geodirects(this.props.auth.token);
        let geodirects: Geodirect[] = [];
        let error: string = undefined;

        try {
            geodirects = await api.list();
        } catch (e) {
            const err: ApiError = e;

            if (err.unauthorized && this.handleUnauthorized(Paths.home.index)) {
                return;
            }

            error = err.message;
        }

        this.setState({ loading: false, geodirects, error });
    }

    public componentDidUpdate() {

    }

    public componentWillReceiveProps(props: IProps) {
        this.configureState(props, true);
    }

    public render() {
        let body: JSX.Element | JSX.Element[];

        if (this.state.loading) {
            body = (
                <div className="text-center" style={{ paddingTop: "50px", paddingBottom: "50px" }}>
                    <CircularProgress />
                </div>
            );
        } else {
            const geosByRegion = this.state.geodirects.reduce((result, geo) => {
                const country = countries.find(c => c.iso === geo.country);
                const region = country.region;

                result[region].push(geo);

                return result;
            }, { Americas: [], Europe: [], Asia: [], Oceania: [], Africa: [], Antarctica: [] });

            body = Object.getOwnPropertyNames(geosByRegion).map(region => {
                const geodirects = geosByRegion[region] as Geodirect[];

                if (geodirects.length === 0) {
                    return null;
                }

                const rows = geodirects.map(geo =>
                    <TR key={geo._id} selected={false}>
                        <TD>{geo.country}</TD>
                        <TD><a href={geo.url} target="_blank">{geo.url}</a></TD>
                        <TD>{truncate(geo.message, 75)}</TD>
                        <TD>{geo.hits || 0}</TD>
                        <TD><DeleteIcon /></TD>
                    </TR>
                );
                return (
                    <div>
                        <h2>{region}</h2>
                        <Table selectable={false} >
                            <TableHeader>
                                <TR>
                                    <TH>{"Country"}</TH>
                                    <TH>{"Redirects To"}</TH>
                                    <TH>{"Message"}</TH>
                                    <TH>{"Hits"}</TH>
                                    <TH><IconButton><DeleteIcon /></IconButton></TH>
                                </TR>
                            </TableHeader>
                            <TableBody deselectOnClickaway={false}>
                                {rows}
                            </TableBody>
                        </Table>
                        <hr />
                    </div>
                );
            });
        };

        return (
            <div>
                <section id="home" className="content">
                    <div className="pure-g align-children">
                        <div className="pure-u-18-24">
                            <h2 className="content-title">{`Geography-based URL redirects for ${this.props.auth.session.shopify_shop_name}`}</h2>
                        </div>
                        <div className="pure-u-6-24 text-right">
                            <RaisedButton primary={true} label={`New Geodirect`} icon={<AddIcon />} onTouchTap={e => this.setState({ dialogOpen: true })} />
                        </div>
                    </div>
                    <hr />
                    {body}
                </section>
                <Dialog open={this.state.dialogOpen} apiToken={this.props.auth.token} onRequestClose={(geo) => this.closeDialog(geo)} />
                {this.state.error ? <Snackbar open={true} autoHideDuration={10000} message={this.state.error} onRequestClose={e => this.closeErrorSnackbar(e)} /> : null}
            </div>
        );
    }
}
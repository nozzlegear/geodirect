import * as React from 'react';
import Toolbar from "./toolbar";
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
import CopyIcon from "material-ui/svg-icons/content/select-all";
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

export interface DetailedGeo extends Geodirect {
    countryName: string;
    regionName: string;
}

export interface GeosByRegion {
    Americas: DetailedGeo[],
    Asia: DetailedGeo[],
    Europe: DetailedGeo[],
    Oceania: DetailedGeo[],
    Antarctica: DetailedGeo[],
    Africa: DetailedGeo[],
}

export interface IProps {

}

export interface IState {
    loading?: boolean;
    error?: string;
    dialogOpen?: boolean;
    selectedGeo?: DetailedGeo;
    geosByRegion?: GeosByRegion
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
        }

        if (!useSetState) {
            this.state = state;

            return;
        }

        this.setState(state);
    }

    private getGeos(): Geodirect[] {
        const geosByRegion = this.state.geosByRegion;
        return Object.getOwnPropertyNames(geosByRegion).reduce((result, region) => {
            result.push(...geosByRegion[region]);

            return result;
        }, [])
    }

    private mapGeosToRegions(geos: Geodirect[]) {
        return geos.reduce((result, geo) => {
            const country = countries.find(c => c.iso === geo.country);
            const region = country.region;

            result[region].push(Object.assign({}, geo, { countryName: country.name }));

            return result;
        }, { Americas: [], Europe: [], Asia: [], Oceania: [], Africa: [], Antarctica: [] });
    }

    private selectRows(rows: string | number[], region: Region) {
        const geos: DetailedGeo[] = this.state.geosByRegion[region];
        let geo: DetailedGeo;

        if (typeof (rows) === "string") {
            geo = geos[0];
        } else {
            geo = rows.length > 0 ? geos[rows[0]] : undefined;
        }

        this.setState({ selectedGeo: geo });
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
        const geos = this.getGeos();

        if (geo) {
            const index = geos.findIndex(g => g._id === geo._id);

            if (index > -1) {
                geos[index] = geo;
            } else {
                geos.push(geo);
            }
        }

        this.setState({ dialogOpen: false, geosByRegion: this.mapGeosToRegions(geos), selectedGeo: undefined });
    }

    private async deleteSelected() {
        if (this.state.loading) {
            this.setState({ error: "Please wait, a Geodirect is already being deleted." });

            return;
        }

        const selectedGeo = this.state.selectedGeo;
        const geos = this.getGeos();
        const index = geos.findIndex(g => g._id === selectedGeo._id);

        await this.setStateAsync({ loading: true, error: undefined, selectedGeo: undefined });

        try {
            const api = new Geodirects(this.props.auth.token);

            await api.delete(selectedGeo._id);

            // Delete the geodirect
            geos.splice(index, 1);

            this.setState({ loading: false,geosByRegion: this.mapGeosToRegions(geos) });
        } catch (e) {
            const err: ApiError = e;

            if (err.unauthorized && this.handleUnauthorized(Paths.home.index)) {
                return;
            }

            this.setState({ loading: false, error: err.message, selectedGeo: selectedGeo, });
        }
    }

    private editSelected() {
        this.setState({dialogOpen: true});
    }

    public async componentDidMount() {
        const api = new Geodirects(this.props.auth.token);
        let geosByRegion: GeosByRegion;
        let error: string = undefined;

        try {
            const geos = await api.list();
            geosByRegion = this.mapGeosToRegions(geos);
        } catch (e) {
            const err: ApiError = e;

            if (err.unauthorized && this.handleUnauthorized(Paths.home.index)) {
                return;
            }

            error = err.message;
        }

        this.setState({ loading: false,  geosByRegion, error });
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
            const geosByRegion = this.state.geosByRegion;
            body = Object.getOwnPropertyNames(geosByRegion).map(region => {
                const geodirects = geosByRegion[region] as (Geodirect & { countryName: string })[];

                if (geodirects.length === 0) {
                    return null;
                }

                const rows = geodirects.map((geo, i) =>
                    <TR key={geo._id} selected={this.state.selectedGeo && this.state.selectedGeo._id === geo._id}>
                        <TD>{geo.countryName}</TD>
                        <TD><a href={geo.url} title={geo.url} target="_blank">{geo.url}</a></TD>
                        <TD><span title={geo.message}>{truncate(geo.message, 75)}</span></TD>
                        <TD>{geo.hits || 0}</TD>
                    </TR>
                );

                return (
                    <div key={region}>
                        <h2>{region}</h2>
                        <Table selectable={true} multiSelectable={false} onRowSelection={rows => this.selectRows(rows, region as Region)} >
                            <TableHeader>
                                <TR>
                                    <TH>{"Country"}</TH>
                                    <TH>{"Redirects To"}</TH>
                                    <TH>{"Message"}</TH>
                                    <TH>{"Hits"}</TH>
                                </TR>
                            </TableHeader>
                            <TableBody deselectOnClickaway={false} >
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
                            <RaisedButton primary={true} label={`New Geodirect`} icon={<AddIcon />} onTouchTap={e => this.setState({ dialogOpen: true, selectedGeo: undefined })} />
                        </div>
                    </div>
                    <hr />
                    {body}
                </section>
                {!!this.state.selectedGeo ? <Toolbar theme={theme} onRequestDelete={() => this.deleteSelected()} onRequestEdit={() => this.editSelected()} /> : null}
                <Dialog open={this.state.dialogOpen} original={this.state.selectedGeo} apiToken={this.props.auth.token} onRequestClose={(geo) => this.closeDialog(geo)} />
                {this.state.error ? <Snackbar open={true} autoHideDuration={10000} message={this.state.error} onRequestClose={e => this.closeErrorSnackbar(e)} /> : null}
            </div>
        );
    }
}
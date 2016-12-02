import * as React from 'react';
import { Geodirect } from "gearworks";
import Countries from "typed-countries";
import Paths from "../../../modules/paths";
import Router from "../../components/router";
import { Geodirects, ApiError } from "../../../modules/api";
import {
    Dialog,
    RaisedButton,
    TextField,
    Divider,
    FlatButton,
    SelectField,
    MenuItem,
    TouchTapEvent,
    CircularProgress,
} from "material-ui";

export interface IProps extends React.Props<any> {
    open: boolean;
    apiToken: string;
    onRequestClose: (geodirect?: Geodirect) => void;
}

export interface IState {
    error?: string;
    loading?: boolean;
    country?: string;
    message?: string;
    url?: string;
}

export default class NewOrderDialog extends Router<IProps, IState> {
    constructor(props: IProps, context) {
        super(props, context);

        this.configureState(props, false);
    }

    public state: IState = {};

    //#region Utility functions

    private configureState(props: IProps, useSetState: boolean) {
        let state: IState = {
            country: Countries[0].iso,
            message: "",
            url: "",
        }

        if (!useSetState) {
            this.state = state;

            return;
        }

        this.setState(state);
    }

    //#endregion

    private async saveGeodirect() {
        if (this.state.loading) {
            return;
        }

        await this.setStateAsync({ loading: true, error: undefined });

        const api = new Geodirects(this.props.apiToken);
        const geo: Geodirect = {
            country: this.state.country,
            message: this.state.message,
            url: this.state.url,
        }

        try {
            let result: Geodirect;

            if (1 === 1) {
                result = await api.create(geo);
            } else {
                result = await api.update("-1", geo);
            }

            this.props.onRequestClose(result);
        } catch (e) {
            const err: ApiError = e;

            if (err.unauthorized && this.handleUnauthorized(Paths.home.index)) {
                return;
            }

            this.setState({ loading: false, error: err.message });
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
        const props = this.props;
        const state = this.state;
        let actions: JSX.Element[] = [];
        let form: JSX.Element;

        if (this.state.loading) {
            form = (
                <div className="text-center" style={{ paddingTop: "50px", paddingBottom: "50px" }}>
                    <CircularProgress />
                </div>
            )
        } else {
            const country = Countries.find(c => c.iso === this.state.country);
            actions = [
                <FlatButton
                    key="close_dialog"
                    label="Close"
                    style={{ float: "left" }}
                    onTouchTap={e => props.onRequestClose()} />,
                <RaisedButton
                    key="save_button"
                    label="Save Geodirect"
                    primary={true}
                    onTouchTap={e => this.saveGeodirect()} />,
            ];

            form = (
                <form>
                    <div className="form-group">
                        <SelectField floatingLabelText="When a visitor is from this country:" value={country.iso} onChange={(e, i, v) => this.setState({ country: v })} fullWidth={true}>
                            {Countries.map(c => <MenuItem value={c.iso} primaryText={c.name} />)}
                        </SelectField>
                    </div>
                    <div className="form-group">
                        <TextField
                            fullWidth={true}
                            value={this.state.message}
                            onChange={(e) => this.setState({ message: e.currentTarget["value"] })}
                            floatingLabelText="Show them this message:"
                            hintText={`Hello! Would you like to visit our ${country.name} website?`} />
                    </div>
                    <div className="form-group">
                        <TextField
                            fullWidth={true}
                            value={this.state.url}
                            onChange={(e) => this.setState({ url: e.currentTarget["value"] })}
                            floatingLabelText="And send them to this URL:"
                            hintText={`https://${country.iso.toLowerCase()}.example.com`} />
                    </div>
                </form>
            )
        }

        return (
            <Dialog
                open={props.open || false}
                actions={actions}
                modal={true}
                title="New Geodirect"
                onRequestClose={e => props.onRequestClose()}>
                {form}
                {this.state.error ? <p className="error dialog">{this.state.error}</p> : null}
            </Dialog>
        );
    }
}
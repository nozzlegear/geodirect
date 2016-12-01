import * as React from 'react';
import { theme } from "../../app";
import { truncate } from "lodash";
import { observer } from "mobx-react";
import { Models } from "shopify-prime";
import Observer from "../../components/observer";
import AddIcon from "material-ui/svg-icons/content/add";
import { Shopify, ApiError } from "../../../modules/api";
import DeleteIcon from "material-ui/svg-icons/action/delete";
import SelectAllIcon from "material-ui/svg-icons/content/select-all";
import {
    CircularProgress,
    FloatingActionButton,
    MenuItem,
    Snackbar,
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
            loading: false,
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

    public async componentDidMount() {

    }

    public componentDidUpdate() {

    }

    public componentWillReceiveProps(props: IProps) {
        this.configureState(props, true);
    }

    public render() {
        let body: JSX.Element;

        if (this.state.loading) {
            body = (
                <div className="text-center" style={{ paddingTop: "50px", paddingBottom: "50px" }}>
                    <CircularProgress />
                </div>
            );
        } else {
            body = (
                <Table selectable={false} >
                    <TableHeader>
                        <TR>
                            <TH>{"Country"}</TH>
                            <TH>{"Redirects To"}</TH>
                            <TH>{"Message"}</TH>
                            <TH>{"Preserves Path?"}</TH>
                            <TH>{"Test"}</TH>
                        </TR>
                    </TableHeader>
                    <TableBody deselectOnClickaway={false}>
                        <TR key={1} selected={false} >
                            <TD>{"Mexico"}</TD>
                            <TD><a href='' target="_blank">{`https://mx.example.com`}</a></TD>
                            <TD>{truncate("Qui ea aliqua enim cillum et nostrud magna id. In id incididunt fugiat magna nisi proident enim culpa aliquip do culpa. Elit quis ex do incididunt proident deserunt nisi est. Laboris anim dolor consequat cillum excepteur adipisicing ea esse dolor adipisicing.", 75)}</TD>
                            <TD>{true.toString()}</TD>
                            <TD>{"Click to test."}</TD>
                        </TR>
                    </TableBody>
                </Table>
            )
        };

        return (
            <div>
                <section id="home" className="content">
                    <h2 className="content-title">{`Geography-based URL redirects for ${this.props.auth.session.shopify_shop_name}`}</h2>
                    {body}
                </section>
                <FloatingActionButton title="New Geodirect" onClick={e => this.setState({ dialogOpen: true })} style={{ position: "fixed", right: "50px", bottom: "75px" }}>
                    <AddIcon />
                </FloatingActionButton>
                {this.state.error ? <Snackbar open={true} autoHideDuration={10000} message={this.state.error} onRequestClose={e => this.closeErrorSnackbar(e)} /> : null}
            </div>
        );
    }
}
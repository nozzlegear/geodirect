import * as React from "react";
import { MuiTheme } from "material-ui/styles";
import DeleteIcon from "material-ui/svg-icons/action/delete";
import EditIcon from "material-ui/svg-icons/editor/mode-edit";
import { Toolbar, ToolbarGroup, MenuItem, IconMenu, IconButton} from "material-ui";

export interface IProps extends React.Props<any> {
    theme: MuiTheme;
    onRequestDelete: () => void;
    onRequestEdit: () => void;
}

export default function toolbar(props: IProps) {
    const rawTheme = props.theme.rawTheme.palette;
    const toolbarStyle = {
        backgroundColor: rawTheme.primary2Color,
        borderColor: rawTheme.borderColor,
    }
    const groupStyle = {
        alignItems: "center"
    }

    return (
        <Toolbar
            className="sticked-toolbar"
            style={toolbarStyle}>
            <ToolbarGroup firstChild={true} />
            <ToolbarGroup style={groupStyle}>
                <IconButton
                    iconStyle={{ color: rawTheme.alternateTextColor }}
                    title="Edit Geodirect"
                    onTouchTap={e => props.onRequestEdit()}>
                    <EditIcon />
                </IconButton>
                <IconMenu iconButtonElement={<IconButton iconStyle={{ color: rawTheme.alternateTextColor }} title="Delete"><DeleteIcon /></IconButton>}>
                    <MenuItem primaryText="Delete Geodirect" onTouchTap={e => props.onRequestDelete()} />
                </IconMenu>
            </ToolbarGroup>
        </Toolbar>
    );
}
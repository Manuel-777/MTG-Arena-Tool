import React, { useCallback } from "react";
import { getCardArtCrop } from "../../../shared/util";

interface ListItemProps extends JSX.ElementChildrenAttribute {
  click: VoidFunction;
  mouseEnter: VoidFunction;
  mouseLeave: VoidFunction;
}

export function ListItem(props: ListItemProps): JSX.Element {
  const { click, mouseEnter, mouseLeave } = props;
  return (
    <div
      onClick={click}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      className="list_item_container"
    >
      {props.children}
    </div>
  );
}

function getHoverStyle(hover: boolean): React.CSSProperties {
  return hover
    ? {
        opacity: "1",
        width: "200px"
      }
    : {
        opacity: "0.66",
        width: "128px"
      };
}

interface HoverTileProps {
  hover: boolean;
  grpId: number;
}

// This function is faster outside of the component
function getStyle(hover: boolean, grpId: number): React.CSSProperties {
  return {
    backgroundImage: `url(${getCardArtCrop(grpId)})`,
    ...getHoverStyle(hover)
  };
}

export function HoverTile(props: HoverTileProps): JSX.Element {
  const { hover, grpId } = props;

  return <div className="list_item_image" style={getStyle(hover, grpId)}></div>;
}

interface ColumnProps extends JSX.ElementChildrenAttribute {
  style?: React.CSSProperties;
  class?: string;
}

export function Column(props: ColumnProps): JSX.Element {
  const style = props.style || {};
  return (
    <div
      style={{ ...style, flexDirection: "column" }}
      className={props.class || ""}
    >
      {props.children}
    </div>
  );
}

interface FlexProps extends JSX.ElementChildrenAttribute {
  title?: string;
  style?: React.CSSProperties;
  innerClass?: string;
}

export function FlexTop(props: FlexProps): JSX.Element {
  const style = props.style || {};
  return (
    <div style={style} className="flex_top">
      {props.innerClass ? (
        <div title={props.title} className={props.innerClass}>
          {props.children}
        </div>
      ) : (
        props.children
      )}
    </div>
  );
}

export const FlexBottom = FlexTop;

interface ArchiveButtonProps {
  archiveCallback: (id: string) => void;
  hover: boolean;
  isArchived: boolean;
  dataId: string;
}

function archiveButtonStyle(hover: boolean): React.CSSProperties {
  return hover
    ? {
        width: "32px"
      }
    : {
        width: "4px"
      };
}

export function ArchiveButton(props: ArchiveButtonProps): JSX.Element {
  const { isArchived, archiveCallback, dataId } = props;

  return (
    <div
      onClick={(e): void => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        archiveCallback(dataId);
      }}
      className={isArchived ? "list_item_unarchive" : "list_item_archive"}
      title={isArchived ? "restore" : "archive (will not delete data)"}
      style={archiveButtonStyle(props.hover)}
    ></div>
  );
}

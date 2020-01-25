import React from "react";
import { Cell, Row } from "react-table";
import {
  LIST_ITEM_CENTER_AFTER,
  LIST_ITEM_CENTER_BOTTOM,
  LIST_ITEM_CENTER_TOP,
  LIST_ITEM_LEFT_AFTER,
  LIST_ITEM_LEFT_BOTTOM,
  LIST_ITEM_LEFT_TOP,
  LIST_ITEM_RIGHT_AFTER,
  LIST_ITEM_RIGHT_BOTTOM,
  LIST_ITEM_RIGHT_TOP
} from "../../../shared/constants";
import {
  FlexCenterContainer,
  FlexLeftContainer,
  FlexRightContainer,
  MetricText
} from "../display";
import ListItem, { ListItemProps } from "../ListItem";
import { ListViewRowProps, TableData } from "./types";

function ListViewCell<D extends TableData>({
  cell
}: {
  cell: Cell<D>;
}): JSX.Element {
  return (
    <div className="inner_div" {...cell.getCellProps()}>
      {cell.column.needsTileLabel && (
        <MetricText
          style={{
            paddingRight: "8px",
            fontSize: "small",
            whiteSpace: "nowrap",
            fontWeight: 300,
            color: "var(--color-light-50)"
          }}
        >
          {cell.column.render("Header")}:
        </MetricText>
      )}
      {cell.render("Cell")}
    </div>
  );
}

function ListSubSection<D extends TableData>({
  row,
  section
}: {
  row: Row<D>;
  section: number;
}): JSX.Element {
  return (
    <>
      {row.cells
        .filter(cell => cell.column.listItemSection === section)
        .map(cell => {
          return (
            <ListViewCell key={cell.column.id + "_" + row.index} cell={cell} />
          );
        })}
    </>
  );
}

export function ListViewRow<D extends TableData>({
  row,
  grpId,
  title,
  openCallback,
  archiveCallback
}: ListViewRowProps<D>): JSX.Element {
  const { id, custom, archived } = row.original;
  const onClick = (): void => openCallback(id);
  const onClickDelete = custom ? (): void => archiveCallback(id) : undefined;
  const left = {
    top: (
      <FlexLeftContainer>
        <ListSubSection row={row} section={LIST_ITEM_LEFT_TOP} />
      </FlexLeftContainer>
    ),
    bottom: (
      <FlexLeftContainer>
        <ListSubSection row={row} section={LIST_ITEM_LEFT_BOTTOM} />
      </FlexLeftContainer>
    ),
    after: (
      <FlexLeftContainer>
        <ListSubSection row={row} section={LIST_ITEM_LEFT_AFTER} />
      </FlexLeftContainer>
    )
  };
  const center = {
    top: (
      <FlexCenterContainer>
        <ListSubSection row={row} section={LIST_ITEM_CENTER_TOP} />
      </FlexCenterContainer>
    ),
    bottom: (
      <FlexCenterContainer>
        <ListSubSection row={row} section={LIST_ITEM_CENTER_BOTTOM} />
      </FlexCenterContainer>
    ),
    after: (
      <FlexCenterContainer>
        <ListSubSection row={row} section={LIST_ITEM_CENTER_AFTER} />
      </FlexCenterContainer>
    )
  };
  const right = {
    top: (
      <FlexRightContainer>
        <ListSubSection row={row} section={LIST_ITEM_RIGHT_TOP} />
      </FlexRightContainer>
    ),
    bottom: (
      <FlexRightContainer>
        <ListSubSection row={row} section={LIST_ITEM_RIGHT_BOTTOM} />
      </FlexRightContainer>
    ),
    after: (
      <FlexRightContainer>
        <ListSubSection row={row} section={LIST_ITEM_RIGHT_AFTER} />
      </FlexRightContainer>
    )
  };
  const listItemProps: ListItemProps = {
    grpId,
    left,
    center,
    right,
    onClick,
    onClickDelete,
    archived
  };
  return <ListItem {...listItemProps} title={title ?? "show details"} />;
}

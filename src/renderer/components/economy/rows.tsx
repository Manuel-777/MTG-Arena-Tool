import React from "react";
import { TableViewRow } from "../tables/TableViewRow";
import { TableViewRowProps } from "../tables/types";
import { EconomyDayHeader, EconomyDayHeaderProps } from "./EconomyDayHeader";
import { EconomyTableRowProps, TransactionData } from "./types";
import css from "./economy.css";
import { ListItemEconomy } from "../list-item/ListItemEconomy";
import { constants } from "mtgatool-shared";
const { ECONOMY_TABLE_MODE } = constants;

function EconomyListViewGroup({
  row,
}: TableViewRowProps<TransactionData>): JSX.Element {
  const props = row.values as EconomyDayHeaderProps;
  props.subRows = row.subRows;

  return (
    <div className={css.economy_title}>
      <EconomyDayHeader {...props} />
    </div>
  );
}

function EconomyListViewRow({
  row,
}: TableViewRowProps<TransactionData>): JSX.Element {
  return <ListItemEconomy change={row.original} />;
}

export function EconomyTableRow({
  row: groupRow,
  gridTemplateColumns,
  tableMode,
  prepareRow,
  isExpanded,
}: EconomyTableRowProps): JSX.Element {
  const GroupRenderer =
    tableMode === ECONOMY_TABLE_MODE ? TableViewRow : EconomyListViewGroup;
  const RowRenderer =
    tableMode === ECONOMY_TABLE_MODE ? TableViewRow : EconomyListViewRow;
  const rowStyle = { cursor: "default" };
  return (
    <>
      <GroupRenderer
        row={groupRow}
        index={-1}
        key={groupRow.index + "_group"}
        gridTemplateColumns={gridTemplateColumns}
        style={rowStyle}
      />
      {isExpanded &&
        groupRow.subRows.map((row, index) => {
          prepareRow(row);
          return (
            <RowRenderer
              row={row}
              index={index}
              key={groupRow.index + "_" + index}
              gridTemplateColumns={gridTemplateColumns}
              style={rowStyle}
            />
          );
        })}
    </>
  );
}

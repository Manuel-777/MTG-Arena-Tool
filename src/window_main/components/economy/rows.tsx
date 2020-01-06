import React from "react";
import { ECONOMY_TABLE_MODE } from "../../../shared/constants";
import { TableViewRow } from "../tables/TableViewRow";
import { TableViewRowProps } from "../tables/types";
import { EconomyDayHeader, EconomyDayHeaderProps } from "./EconomyDayHeader";
import { ChangeRow } from "./EconomyRow";
import { EconomyTableRowProps, TransactionData } from "./types";

export function EconomyListViewGroup({
  row
}: TableViewRowProps<TransactionData>): JSX.Element {
  const props = row.values as EconomyDayHeaderProps;
  return (
    <div className={"economy_title"}>
      <EconomyDayHeader {...props} />
    </div>
  );
}

export function EconomyListViewRow({
  row
}: TableViewRowProps<TransactionData>): JSX.Element {
  return (
    <div>
      <ChangeRow change={row.original} economyId={row.original.id} />
    </div>
  );
}

export function EconomyTableRow({
  row: groupRow,
  gridTemplateColumns,
  tableMode,
  prepareRow,
  isExpanded
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

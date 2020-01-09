import React from "react";
import { TableData, TableViewRowProps } from "./types";

export function TableViewRow<D extends TableData>({
  row,
  index,
  gridTemplateColumns,
  style,
  className,
  ...otherProps
}: TableViewRowProps<D>): JSX.Element {
  const lineClass = React.useMemo(
    () =>
      index === -1
        ? "line_lighter"
        : index % 2 === 0
        ? "line_light"
        : "line_dark",
    [index]
  );
  return (
    <div
      className={(className ?? "") + " decks_table_body_row " + lineClass}
      style={{ ...style, gridTemplateColumns }}
      {...otherProps}
    >
      {row.cells.map(cell => {
        return (
          <div
            className="inner_div"
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
          >
            {cell.isAggregated
              ? cell.render("Aggregated")
              : cell.render("Cell")}
          </div>
        );
      })}
    </div>
  );
}

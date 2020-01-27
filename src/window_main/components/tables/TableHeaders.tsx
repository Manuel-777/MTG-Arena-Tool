import React from "react";
import { TableData, TableHeadersProps } from "./types";

export default function TableHeaders<D extends TableData>({
  filtersVisible,
  getTableProps,
  gridTemplateColumns,
  setFilter,
  setFiltersVisible,
  style,
  visibleHeaders
}: TableHeadersProps<D>): JSX.Element {
  return (
    <div
      className="med_scroll react_table_head line_dark"
      style={{ ...style, gridTemplateColumns }}
      {...getTableProps()}
    >
      {visibleHeaders.map((column, ii) => (
        <div
          {...column.getHeaderProps(column.getSortByToggleProps())}
          className={"hover_label"}
          style={{
            gridArea: `1 / ${ii + 1} / 1 / ${ii + 2}`,
            cursor: column.disableSortBy ? "default" : "pointer"
          }}
          key={column.id}
        >
          <div className={"react_table_head_container"}>
            <div
              className={
                column.isSorted
                  ? column.isSortedDesc
                    ? " sort_desc"
                    : " sort_asc"
                  : ""
              }
              style={{ marginRight: "4px", width: "16px" }}
            />
            <div className={"flex_item"}>{column.render("Header")}</div>
            {column.canFilter && (
              <div
                style={{ marginRight: 0 }}
                className={"button settings"}
                onClick={(e): void => {
                  e.stopPropagation();
                  setFiltersVisible({
                    ...filtersVisible,
                    [column.id]: !filtersVisible[column.id]
                  });
                }}
                title={
                  (filtersVisible[column.id] ? "hide" : "show") +
                  " column filter"
                }
              />
            )}
            {column.filterValue && (
              <div
                style={{ marginRight: 0 }}
                className={"button close"}
                onClick={(e): void => {
                  e.stopPropagation();
                  setFilter(column.id, undefined);
                }}
                title={"clear column filter"}
              />
            )}
          </div>
          {column.canFilter && filtersVisible[column.id] && (
            <div
              onClick={(e): void => e.stopPropagation()}
              style={{
                display: "flex",
                justifyContent: "center"
              }}
              title={"filter column"}
            >
              {column.render("Filter")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

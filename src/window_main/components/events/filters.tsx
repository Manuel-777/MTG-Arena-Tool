import _ from "lodash";
import matchSorter from "match-sorter";
import React from "react";
import { ColumnInstance, FilterValue, Row } from "react-table";
import { MANA } from "../../../shared/constants";
import { BinaryColumnFilter, BinaryFilterValue } from "../tables/filters";
import { EventTableData } from "./types";

export function EventStateColumnFilter(props: {
  column: ColumnInstance<EventTableData>;
}): JSX.Element {
  return (
    <BinaryColumnFilter
      {...props}
      trueLabel={"Completed"}
      falseLabel={"In Progress"}
    />
  );
}

export function eventStateFilterFn(
  rows: Row<EventTableData>[],
  id: string,
  filterValue: BinaryFilterValue
): Row<EventTableData>[] {
  return rows.filter(row =>
    Object.entries(filterValue).some(
      ([code, value]) => value && String(row.original.isComplete) === code
    )
  );
}

const colorSearchKeyFactory = (
  colorKey: string
): ((row: Row<EventTableData>) => string) => {
  return (row: Row<EventTableData>): string => {
    const colors = row.values[colorKey];
    return colors.map((color: number): string => MANA[color]).join(" ");
  };
};

export function eventSearchFilterFn(
  rows: Row<EventTableData>[],
  columnIds: string[],
  filterValue: FilterValue
): Row<EventTableData>[] {
  const tokens = String(filterValue)
    .split(" ")
    .filter(token =>
      token.includes(":") ? token.split(":")[1].length > 2 : token.length > 2
    );
  if (tokens.length === 0) {
    return rows;
  }
  const events = tokens.map(token => {
    return matchSorter(rows, token, {
      keys: [
        "values.name",
        "values.InternalEventName",
        "values.deckName",
        colorSearchKeyFactory("colors")
      ]
    });
  });
  return _.intersection(...events);
}

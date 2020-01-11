import _ from "lodash";
import matchSorter from "match-sorter";
import { FilterValue, Row } from "react-table";
import { MANA } from "../../../shared/constants";
import { EventTableData } from "./types";

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

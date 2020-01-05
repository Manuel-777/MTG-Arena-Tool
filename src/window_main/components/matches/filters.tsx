import _ from "lodash";
import matchSorter from "match-sorter";
import { FilterValue, Row } from "react-table";
import { MANA } from "../../../shared/constants";
import { MatchTableData } from "./types";

const colorSearchKeyFactory = (
  colorKey: string
): ((row: Row<MatchTableData>) => string) => {
  return (row: Row<MatchTableData>): string => {
    const colors = row.values[colorKey];
    return colors.map((color: number): string => MANA[color]).join(" ");
  };
};

export function matchSearchFilterFn(
  rows: Row<MatchTableData>[],
  columnIds: string[],
  filterValue: FilterValue
): Row<MatchTableData>[] {
  const tokens = String(filterValue)
    .split(" ")
    .filter(token =>
      token.includes(":") ? token.split(":")[1].length > 2 : token.length > 2
    );
  if (tokens.length === 0) {
    return rows;
  }
  const matches = tokens.map(token => {
    return matchSorter(rows, token, {
      keys: [
        "values.deckName",
        "values.oppArchetype",
        "values.oppName",
        "values.deckTags",
        "values.tags",
        colorSearchKeyFactory("colors"),
        colorSearchKeyFactory("oppColors")
      ]
    });
  });
  return _.intersection(...matches);
}

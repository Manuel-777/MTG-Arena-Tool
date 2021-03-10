import _ from "lodash";
import matchSorter from "match-sorter";
import { Row } from "react-table";
import { TransactionData } from "./types";

export function txnSearchFilterFn(
  rows: Row<TransactionData>[],
  _columnIds: string[],
  filterValue: string
): Row<TransactionData>[] {
  const tokens = filterValue.split(" ").filter((token) => token.length > 2);
  if (tokens.length === 0) {
    return rows;
  }
  const matches = tokens.map((token) =>
    matchSorter(rows, token, {
      keys: [
        "values.fullContext",
        "values.date",
        "values.delta.vanityItemsAdded",
        "values.delta.vanityItemsRemoved",
      ],
    })
  );
  return _.intersection(...matches);
}

import React from "react";
import { TableInstance } from "react-table";
import { AggregatorFilters } from "../../aggregator";
import { isHidingArchived } from "./filters";
import { TableData } from "./types";

export function useAggregatorArchiveDecksFilter<D extends TableData>(
  table: TableInstance<D>,
  aggFilters: AggregatorFilters,
  setAggFiltersCallback: (filters: AggregatorFilters) => void
): void {
  const {
    state: { filters },
  } = table;
  React.useEffect(() => {
    if (isHidingArchived({ filters }) === !!aggFilters.showArchivedDecks) {
      setAggFiltersCallback({
        ...aggFilters,
        showArchivedDecks: !isHidingArchived({ filters }),
      });
    }
  }, [aggFilters, setAggFiltersCallback, filters]);
}



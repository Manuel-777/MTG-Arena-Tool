import React from "react";
import { TableInstance } from "react-table";
import { AggregatorFilters } from "../../aggregator";
import { isHidingArchived } from "./filters";
import { TableData } from "./types";

export function useAggregatorArchiveMatchesFilter<D extends TableData>(
  table: TableInstance<D>,
  aggFilters: AggregatorFilters,
  setAggFiltersCallback: (filters: AggregatorFilters) => void
): void {
  const {
    state: { filters },
  } = table;
  React.useEffect(() => {
    if (isHidingArchived({ filters }) === !!aggFilters.showArchivedMatches) {
      setAggFiltersCallback({
        ...aggFilters,
        showArchivedMatches: !isHidingArchived({ filters }),
      });
    }
  }, [aggFilters, setAggFiltersCallback, filters]);
}

import React from "react";
import { TableInstance } from "react-table";
import { AggregatorFilters } from "../../aggregator";
import { isHidingArchived } from "./filters";
import { TableData } from "./types";

export function useAggregatorArchiveFilter<D extends TableData>(
  table: TableInstance<D>,
  aggFilters: AggregatorFilters,
  setAggFiltersCallback: (filters: AggregatorFilters) => void
): void {
  const {
    state: { filters }
  } = table;
  React.useEffect(() => {
    if (isHidingArchived({ filters }) === !!aggFilters.showArchived) {
      setAggFiltersCallback({
        ...aggFilters,
        showArchived: !isHidingArchived({ filters })
      });
    }
  }, [aggFilters, setAggFiltersCallback, filters]);
}

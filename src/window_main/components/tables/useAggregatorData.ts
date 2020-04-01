import React from "react";
import { useSelector } from "react-redux";
import store, { AppState } from "../../../shared-redux/stores/rendererStore";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import { TableData } from "../tables/types";

export function getDefaultAggFilters(
  showArchived: boolean,
  aggFiltersArg?: AggregatorFilters
): AggregatorFilters {
  const { last_date_filter: dateFilter } = store.getState().settings;
  return {
    ...Aggregator.getDefaultFilters(),
    date: dateFilter,
    eventId: Aggregator.DEFAULT_EVENT,
    ...aggFiltersArg,
    showArchived
  };
}

export function useAggregatorData<D extends TableData>({
  aggFiltersArg,
  getData,
  showArchived,
  forceMemo
}: {
  aggFiltersArg?: AggregatorFilters;
  getData: (
    aggregator: Aggregator,
    archivedCache: Record<string, boolean>
  ) => D[];
  showArchived: boolean;
  forceMemo?: any;
}): {
  aggFilters: AggregatorFilters;
  data: D[];
  setAggFilters: (aggFilters: AggregatorFilters) => void;
} {
  const defaultAggFilters = getDefaultAggFilters(showArchived, aggFiltersArg);
  const [aggFilters, setAggFilters] = React.useState(defaultAggFilters);
  React.useEffect(() => {
    const defaultAggFilters = getDefaultAggFilters(showArchived, aggFiltersArg);
    setAggFilters(defaultAggFilters);
  }, [aggFiltersArg, showArchived]);
  const archivedCache = useSelector(
    (state: AppState) => state.renderer.archivedCache
  );
  const data = React.useMemo(() => {
    forceMemo;
    const aggregator = new Aggregator(aggFilters);
    return getData(aggregator, archivedCache);
  }, [aggFilters, archivedCache, getData, forceMemo]);
  return {
    aggFilters,
    data,
    setAggFilters
  };
}

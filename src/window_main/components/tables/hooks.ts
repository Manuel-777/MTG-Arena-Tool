import _ from "lodash";
import React from "react";
import {
  Row,
  SortByFn,
  TableInstance,
  TableState,
  useFilters,
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
  IdType
} from "react-table";
import pd from "../../../shared/PlayerData";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import { getLocalState, setLocalState } from "../../renderer-util";
import {
  archivedFilterFn,
  colorsFilterFn,
  fuzzyTextFilterFn,
  isHidingArchived
} from "../tables/filters";
import {
  BaseTableProps,
  FiltersVisible,
  MultiSelectFilterProps,
  PagingControlsProps,
  TableControlsProps,
  TableData,
  TableHeadersProps
} from "../tables/types";

export function useMultiSelectFilter<D>(
  props: MultiSelectFilterProps<D>
): [
  D,
  (
    code: string
  ) => (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
] {
  const { filterKey, filters, onFilterChanged } = props;
  const filterValue = filters[filterKey];
  const onClickMultiFilter = React.useCallback(
    (code: string) => (event: React.MouseEvent<HTMLDivElement>): void => {
      (filterValue as any)[code] = event.currentTarget.classList.contains(
        "rarity_filter_on"
      );
      event.currentTarget.classList.toggle("rarity_filter_on");
      onFilterChanged(filterValue);
    },
    [filterValue, onFilterChanged]
  );
  return [filterValue, onClickMultiFilter];
}

export function useEnumSort<D extends TableData>(
  enums: readonly string[]
): SortByFn<D> {
  return React.useCallback(
    (rowA: Row<D>, rowB: Row<D>, columnId: IdType<D>): 0 | 1 | -1 => {
      const indexDiff =
        enums.indexOf(rowA.values[columnId]) -
        enums.indexOf(rowB.values[columnId]);
      return indexDiff < 0 ? -1 : indexDiff > 0 ? 1 : 0;
    },
    [enums]
  );
}

export function useLegacyRenderer(
  renderEventRow: (container: HTMLDivElement, ...rendererArgs: any[]) => any,
  ...rendererArgs: any[]
): React.RefObject<HTMLDivElement> {
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (containerRef?.current) {
      containerRef.current.innerHTML = "";
      renderEventRow(containerRef.current, ...rendererArgs);
    }
  }, [containerRef, renderEventRow, rendererArgs]);
  return containerRef;
}

export function useBlurOnEnter(): [
  React.RefObject<HTMLInputElement>,
  (e: React.KeyboardEvent<HTMLInputElement>) => void
] {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (inputRef?.current) {
        if (e.keyCode === 13) {
          inputRef.current.blur();
        }
      }
    },
    [inputRef]
  );
  return [inputRef, onKeyDown];
}

export function useLastScrollTop(): [
  React.RefObject<HTMLDivElement>,
  () => void
] {
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (containerRef?.current) {
      const { lastScrollTop } = getLocalState();
      if (lastScrollTop) {
        containerRef.current.scrollTop = lastScrollTop;
      }
    }
  }, [containerRef]);
  const onScroll = React.useCallback(() => {
    if (containerRef?.current) {
      setLocalState({ lastScrollTop: containerRef.current.scrollTop });
    }
  }, []);
  return [containerRef, onScroll];
}

export function useAggregatorAndSidePanel<D extends TableData>({
  aggFiltersArg,
  getData,
  getDataAggFilters,
  showArchived,
  updateSidebarCallback
}: {
  aggFiltersArg: AggregatorFilters;
  getData: (aggregator: Aggregator) => D[];
  getDataAggFilters: (data: D[]) => AggregatorFilters;
  showArchived: boolean;
  updateSidebarCallback: (
    container: HTMLElement,
    aggregator: Aggregator
  ) => void;
}): {
  aggFilters: AggregatorFilters;
  data: D[];
  filterDataCallback: (data: D[]) => void;
  rightPanelRef: React.RefObject<HTMLDivElement>;
  setAggFilters: (aggFilters: AggregatorFilters) => void;
  sidePanelWidth: string;
} {
  const {
    last_date_filter: dateFilter,
    right_panel_width: panelWidth
  } = pd.settings;
  const defaultAggFilters = {
    ...Aggregator.getDefaultFilters(),
    date: dateFilter,
    ...aggFiltersArg,
    showArchived
  };
  const [aggFilters, setAggFilters] = React.useState(
    defaultAggFilters as AggregatorFilters
  );
  const data = React.useMemo(() => {
    const aggregator = new Aggregator(aggFilters);
    return getData(aggregator);
  }, [aggFilters, getData]);
  const sidePanelWidth = panelWidth + "px";
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const filterDataCallback = React.useCallback(
    (data: D[]): void => {
      if (rightPanelRef?.current) {
        updateSidebarCallback(
          rightPanelRef.current,
          new Aggregator({ ...aggFilters, ...getDataAggFilters(data) })
        );
      }
    },
    [rightPanelRef, aggFilters, getDataAggFilters, updateSidebarCallback]
  );
  return {
    aggFilters,
    data,
    filterDataCallback,
    rightPanelRef,
    setAggFilters,
    sidePanelWidth
  };
}

export function useBaseReactTable<D extends TableData>({
  columns,
  customDefaultColumn,
  customFilterTypes,
  customHooks,
  customProps,
  defaultState,
  globalFilter,
  setTableMode,
  tableMode,
  data,
  filterDataCallback,
  tableStateCallback,
  cachedState
}: BaseTableProps<D>): {
  table: TableInstance<D>;
  pagingProps: PagingControlsProps;
  gridTemplateColumns: string;
  headersProps: TableHeadersProps<D>;
  tableControlsProps: TableControlsProps<D>;
} {
  const defaultColumn = React.useMemo(
    () => ({
      disableFilters: true,
      disableGroupBy: true,
      ...customDefaultColumn
    }),
    [customDefaultColumn]
  );
  const filterTypes = React.useMemo(
    () => ({
      fuzzyText: fuzzyTextFilterFn,
      showArchived: archivedFilterFn,
      colors: colorsFilterFn,
      ...customFilterTypes
    }),
    [customFilterTypes]
  );
  const initialState: TableState<D> = React.useMemo(() => {
    // default hidden columns
    const hiddenColumns = columns
      .filter(column => !column.defaultVisible)
      .map(column => column.id ?? column.accessor);
    const mergedDefault = _.defaults(defaultState, {
      pageSize: 25,
      hiddenColumns
    }) as TableState<D>;
    const state = cachedState ?? mergedDefault;

    // ensure data-only columns are all invisible
    const hiddenSet = new Set(state.hiddenColumns ?? []);
    for (const column of columns) {
      const id = column.id ?? column.accessor;
      if (id && !column.defaultVisible && !column.mayToggle) {
        hiddenSet.add(id + "");
      }
    }
    state.hiddenColumns = [...hiddenSet];
    return state;
  }, [cachedState, columns, defaultState]);

  const table = useTable<D>(
    {
      columns: React.useMemo(() => columns, [columns]),
      data: React.useMemo(() => data, [data]),
      defaultColumn,
      filterTypes,
      globalFilter: React.useMemo(() => globalFilter, [globalFilter]),
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false,
      ...customProps
    },
    useFilters,
    useGlobalFilter,
    ...(customHooks ?? []),
    useSortBy,
    usePagination
  );
  const {
    flatColumns,
    headers,
    getTableProps,
    rows,
    toggleSortBy,
    toggleHideColumn,
    setAllFilters,
    setFilter,
    preGlobalFilteredRows,
    setGlobalFilter,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state
  } = table;
  const { filters, pageIndex, pageSize } = state;

  React.useEffect(() => {
    tableStateCallback({ ...state });
  }, [state, tableStateCallback]);
  React.useEffect(() => {
    filterDataCallback && filterDataCallback(rows.map(row => row.original));
  }, [filterDataCallback, rows]);

  const pagingProps: PagingControlsProps = {
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    pageIndex,
    pageSize
  };

  const visibleHeaders = headers.filter(header => header.isVisible);
  const gridTemplateColumns = visibleHeaders
    .map(header => `minmax(${header.gridWidth ?? "140px"}, auto)`)
    .join(" ");
  const [toggleableColumns, initialFiltersVisible] = React.useMemo(() => {
    const toggleableColumns = flatColumns.filter(column => column.mayToggle);
    const initialFiltersVisible: FiltersVisible = {};
    for (const column of flatColumns) {
      if (column.canFilter) {
        initialFiltersVisible[column.id] = !!column.filterValue;
      }
    }
    return [toggleableColumns, initialFiltersVisible];
  }, [flatColumns]);
  const [filtersVisible, setFiltersVisible] = React.useState(
    initialFiltersVisible
  );
  const [togglesVisible, setTogglesVisible] = React.useState(false);
  const headersProps = {
    filtersVisible,
    getTableProps,
    gridTemplateColumns,
    setFilter,
    setFiltersVisible,
    visibleHeaders
  };

  const tableControlsProps: TableControlsProps<D> = {
    filters,
    flatColumns,
    getTableProps,
    globalFilter: state.globalFilter,
    gridTemplateColumns,
    initialFiltersVisible,
    pagingProps,
    preGlobalFilteredRows,
    setAllFilters,
    setFilter,
    setFiltersVisible,
    setGlobalFilter,
    setTableMode,
    setTogglesVisible,
    tableMode,
    toggleableColumns,
    togglesVisible,
    toggleHideColumn,
    toggleSortBy,
    visibleHeaders,
    ...customProps
  };
  return {
    table,
    pagingProps,
    gridTemplateColumns,
    headersProps,
    tableControlsProps
  };
}

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

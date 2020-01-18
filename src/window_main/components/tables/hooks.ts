import _ from "lodash";
import React from "react";
import {
  ColumnInstance,
  TableInstance,
  TableState,
  useFilters,
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable
} from "react-table";
import pd from "../../../shared/player-data";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import {
  archivedFilterFn,
  colorsFilterFn,
  fuzzyTextFilterFn
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
  gridTemplateColumns: string;
  pagingProps: PagingControlsProps;
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
    const state = _.defaultsDeep(cachedState, {
      pageSize: 25,
      ...defaultState,
      hiddenColumns
    });
    // ensure data-only columns are all invisible
    for (const column of columns) {
      if (!column.defaultVisible && !column.mayToggle) {
        state.hiddenColumns.push(column.id ?? column.accessor);
      }
    }
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
    .map(header => header.gridWidth ?? "1fr")
    .join(" ");

  const tableControlsProps: TableControlsProps<D> = {
    canNextPage,
    canPreviousPage,
    filters,
    flatColumns,
    getTableProps,
    globalFilter: state.globalFilter,
    gotoPage,
    gridTemplateColumns,
    nextPage,
    pageCount,
    pageIndex,
    pageOptions,
    pageSize,
    preGlobalFilteredRows,
    previousPage,
    setAllFilters,
    setFilter,
    setGlobalFilter,
    setPageSize,
    setTableMode,
    tableMode,
    toggleHideColumn,
    toggleSortBy,
    visibleHeaders,
    ...customProps
  };
  return { table, gridTemplateColumns, pagingProps, tableControlsProps };
}

export function useBaseTableControls<D extends TableData>({
  canNextPage,
  canPreviousPage,
  flatColumns,
  getTableProps,
  gotoPage,
  gridTemplateColumns,
  nextPage,
  pageCount,
  pageLabel,
  pageIndex,
  pageOptions,
  pageSize,
  pageSizeOptions,
  previousPage,
  setFilter,
  setPageSize,
  visibleHeaders
}: TableControlsProps<D>): {
  toggleableColumns: ColumnInstance<D>[];
  initialFiltersVisible: FiltersVisible;
  filtersVisible: FiltersVisible;
  setFiltersVisible: (filters: FiltersVisible) => void;
  togglesVisible: boolean;
  setTogglesVisible: (togglesVisible: boolean) => void;
  pagingProps: PagingControlsProps;
  headersProps: TableHeadersProps<D>;
} {
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
  const pagingProps = {
    canPreviousPage,
    canNextPage,
    pageLabel,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    pageIndex,
    pageSize,
    pageSizeOptions
  };
  const headersProps = {
    filtersVisible,
    getTableProps,
    gridTemplateColumns,
    setFilter,
    setFiltersVisible,
    visibleHeaders
  };
  return {
    toggleableColumns,
    initialFiltersVisible,
    filtersVisible,
    setFiltersVisible,
    togglesVisible,
    setTogglesVisible,
    pagingProps,
    headersProps
  };
}

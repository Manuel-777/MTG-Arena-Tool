import _ from "lodash";
import React from "react";
import {
  TableInstance,
  TableState,
  useFilters,
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable
} from "react-table";
import {
  archivedFilterFn,
  colorsFilterFn,
  fuzzyTextFilterFn
} from "../tables/filters";
import {
  BaseTableProps,
  FiltersVisible,
  PagingControlsProps,
  TableControlsProps,
  TableData,
  TableHeadersProps
} from "../tables/types";

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
    const state = { ...(cachedState ?? mergedDefault) };
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
    ...(customHooks ?? [useSortBy]),
    usePagination
  );
  const {
    headers,
    getTableProps,
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
  // It seems allComumns can be undefined on some cycles of the table hook
  const allColumns = table.allColumns || [];
  const { filters, pageIndex, pageSize } = state;
  React.useEffect(() => {
    tableStateCallback({ ...state });
  }, [state, tableStateCallback]);
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
    const toggleableColumns = allColumns.filter(column => column.mayToggle);
    const initialFiltersVisible: FiltersVisible = {};
    for (const column of allColumns) {
      if (column.canFilter) {
        initialFiltersVisible[column.id] = !!column.filterValue;
      }
    }
    return [toggleableColumns, initialFiltersVisible];
  }, [allColumns]);
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
    allColumns,
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

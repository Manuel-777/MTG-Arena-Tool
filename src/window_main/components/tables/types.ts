import {
  CellValue,
  Column,
  ColumnInstance,
  Filters,
  FilterValue,
  IdType,
  Row,
  TablePropGetter,
  TableProps,
  TableState,
  PluginHook
} from "react-table";

export type TagCount = { tag: string; q: number };

export type TagCounts = TagCount[];

export type TableData = Record<string, CellValue>;

export type FiltersVisible = { [key: string]: boolean };

export interface MultiSelectFilterProps<D> {
  filterKey: string;
  filters: { [key: string]: D };
  onFilterChanged: (filter: D) => void;
}

export interface BaseTableProps<D extends TableData> {
  cachedState?: TableState<D>;
  columns: Column<D>[];
  customDefaultColumn?: Partial<Column<D>>;
  customFilterTypes?: { [key: string]: any };
  customHooks?: PluginHook<D>[];
  customProps?: { [key: string]: any };
  data: D[];
  defaultState?: Partial<TableState<D>>;
  globalFilter:
    | string
    | ((
        rows: Row<D>[],
        columnIds: IdType<D>[],
        filterValue: FilterValue
      ) => Row<D>[])
    | undefined;
  setTableMode: (tableMode: string) => void;
  tableMode: string;
  tableStateCallback: (state: TableState<D>) => void;
}

export interface PagingControlsProps {
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageOptions: number[];
  pageCount: number;
  gotoPage: (updater: ((pageIndex: number) => number) | number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (pageSize: number) => void;
  pageIndex: number;
  pageLabel?: string;
  pageSize: number;
  pageSizeOptions?: string[];
}

export interface TableControlsProps<D extends TableData> {
  filters: Filters<D>;
  allColumns: ColumnInstance<D>[];
  getTableProps: (propGetter?: TablePropGetter<D>) => TableProps;
  globalFilter: FilterValue;
  pagingProps: PagingControlsProps;
  gridTemplateColumns: string;
  initialFiltersVisible: FiltersVisible;
  preGlobalFilteredRows: Row<D>[];
  setAllFilters: (
    updater: Filters<D> | ((filters: Filters<D>) => Filters<D>)
  ) => void;
  setFilter: (
    columnId: IdType<D>,
    updater: ((filterValue: FilterValue) => FilterValue) | FilterValue
  ) => void;
  setFiltersVisible: (filters: FiltersVisible) => void;
  setGlobalFilter: (filterValue: FilterValue) => void;
  setTableMode: (tableMode: string) => void;
  setTogglesVisible: (togglesVisible: boolean) => void;
  tableMode: string;
  toggleableColumns: ColumnInstance<D>[];
  togglesVisible: boolean;
  toggleHideColumn: (columnId: IdType<D>, value?: boolean) => void;
  toggleSortBy: (
    columnId: IdType<D>,
    descending: boolean,
    isMulti: boolean
  ) => void;
  visibleHeaders: ColumnInstance<D>[];
}

export interface TableHeadersProps<D extends TableData> {
  filtersVisible: FiltersVisible;
  getTableProps: (propGetter?: TablePropGetter<D>) => TableProps;
  gridTemplateColumns: string;
  setFilter: (
    columnId: IdType<D>,
    updater: ((filterValue: FilterValue) => FilterValue) | FilterValue
  ) => void;
  setFiltersVisible: (filters: FiltersVisible) => void;
  style?: React.CSSProperties;
  visibleHeaders: ColumnInstance<D>[];
}

export interface TableViewRowProps<D extends TableData>
  extends React.HTMLAttributes<HTMLDivElement> {
  row: Row<D>;
  index: number;
  gridTemplateColumns: string;
}

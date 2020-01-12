import _ from "lodash";
import React from "react";
import {
  Column,
  useFilters,
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable
} from "react-table";
import { EVENTS_TABLE_MODE } from "../../../shared/constants";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  MetricCell,
  RelativeTimeCell,
  ShortTextCell,
  TextCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  archivedFilterFn,
  ColorColumnFilter,
  colorsFilterFn,
  fuzzyTextFilterFn,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { TableViewRow } from "../tables/TableViewRow";
import { PagingControlsProps } from "../tables/types";
import EventsListViewRow from "./EventsListViewRow";
import EventsTableControls from "./EventsTableControls";
import { eventSearchFilterFn } from "./filters";
import {
  EventsTableControlsProps,
  EventsTableProps,
  EventsTableState,
  EventTableData
} from "./types";

export default function EventsTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterMatchesCallback
}: EventsTableProps): JSX.Element {
  const defaultColumn = React.useMemo(
    () => ({
      disableFilters: true
    }),
    []
  );
  const columns: Column<EventTableData>[] = React.useMemo(
    () => [
      { accessor: "id" },
      { accessor: "date" },
      {
        Header: "Played",
        accessor: "timestamp",
        Cell: RelativeTimeCell,
        sortDescFirst: true,
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Code",
        accessor: "InternalEventName",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true
      },
      {
        Header: "Event",
        accessor: "displayName",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "CourseDeck" },
      { accessor: "deckId" },
      {
        Header: "Deck",
        accessor: "deckName",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "colors" },
      {
        Header: "Colors",
        disableFilters: false,
        accessor: "colorSortVal",
        Filter: ColorColumnFilter,
        filter: "colors",
        Cell: ColorsCell,
        gridWidth: "150px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Duration",
        accessor: "duration",
        Cell: DurationCell,
        gridWidth: "100px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Won",
        accessor: "wins",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Lost",
        accessor: "losses",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Games Won",
        accessor: "gameWins",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Games Lost",
        accessor: "gameLosses",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      { accessor: "isMissingMatchData" },
      { accessor: "CurrentEventState" },
      {
        Header: "State",
        accessor: "eventState",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: TextCell,
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "custom" },
      { accessor: "archived" },
      {
        id: "archivedCol",
        Header: ArchiveHeader,
        accessor: "archivedSortVal",
        filter: "showArchived",
        Filter: ArchiveColumnFilter,
        disableFilters: false,
        Cell: ArchivedCell,
        sortType: "basic",
        gridWidth: "100px",
        mayToggle: true
      }
    ],
    []
  );
  const filterTypes = React.useMemo(
    () => ({
      colors: colorsFilterFn,
      fuzzyText: fuzzyTextFilterFn,
      showArchived: archivedFilterFn
    }),
    []
  );
  const initialState: EventsTableState = React.useMemo(() => {
    // default hidden columns
    const hiddenColumns = columns
      .filter(column => !column.defaultVisible)
      .map(column => column.id ?? column.accessor);
    const state = _.defaultsDeep(cachedState, {
      hiddenColumns,
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      sortBy: [{ id: "timestamp", desc: true }],
      pageSize: 25
    });
    // ensure data-only columns are all invisible
    for (const column of columns) {
      if (!column.defaultVisible && !column.mayToggle) {
        state.hiddenColumns.push(column.id ?? column.accessor);
      }
    }
    return state;
  }, [cachedState, columns]);

  const {
    flatColumns,
    headers,
    getTableProps,
    getTableBodyProps,
    rows,
    page,
    prepareRow,
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
  } = useTable(
    {
      columns,
      data: React.useMemo(() => data, [data]),
      defaultColumn,
      filterTypes,
      globalFilter: eventSearchFilterFn,
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );
  const { filters, globalFilter, pageIndex, pageSize } = state;
  const [tableMode, setTableMode] = React.useState(cachedTableMode);

  React.useEffect(() => {
    tableStateCallback({ ...state, eventsTableMode: tableMode });
  }, [state, tableMode, tableStateCallback]);
  React.useEffect(() => {
    const matchIds = _.flatten(rows.map(row => row.original.stats.matchIds));
    filterMatchesCallback(matchIds);
  }, [filterMatchesCallback, rows]);

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

  const tableControlsProps: EventsTableControlsProps = {
    aggFilters,
    canNextPage,
    canPreviousPage,
    events,
    filters,
    flatColumns,
    getTableProps,
    globalFilter,
    gotoPage,
    gridTemplateColumns,
    nextPage,
    pageCount,
    pageIndex,
    pageOptions,
    pageSize,
    preGlobalFilteredRows,
    previousPage,
    setAggFiltersCallback,
    setAllFilters,
    setFilter,
    setGlobalFilter,
    setPageSize,
    setTableMode,
    tableMode,
    toggleHideColumn,
    toggleSortBy,
    visibleHeaders
  };

  return (
    <div className="decks_table_wrap">
      <EventsTableControls {...tableControlsProps} />
      <div className="decks_table_body" {...getTableBodyProps()}>
        {page.map((row, index) => {
          prepareRow(row);
          if (tableMode === EVENTS_TABLE_MODE) {
            return (
              <TableViewRow
                row={row}
                index={index}
                key={row.index}
                gridTemplateColumns={gridTemplateColumns}
              />
            );
          }
          return (
            <EventsListViewRow
              row={row}
              index={index}
              key={row.index}
              gridTemplateColumns={gridTemplateColumns}
            />
          );
        })}
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}

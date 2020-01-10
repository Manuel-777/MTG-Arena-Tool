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
import { MATCHES_TABLE_MODE } from "../../../shared/constants";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  MetricCell,
  PercentCell,
  RelativeTimeCell,
  ShortTextCell,
  TagsCell
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
import { MatchTagsCell, OnPlayCell, RankCell } from "./cells";
import {
  matchSearchFilterFn,
  OnPlayColumnFilter,
  onPlayFilterFn,
  RankColumnFilter,
  rankFilterFn
} from "./filters";
import MatchesListViewRow from "./MatchesListViewRow";
import MatchesTableControls from "./MatchesTableControls";
import {
  MatchesTableControlsProps,
  MatchesTableProps,
  MatchesTableState,
  MatchTableData
} from "./types";

export default function MatchesTable({
  data,
  aggFilters,
  events,
  tags,
  setAggFiltersCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterMatchesCallback,
  openMatchCallback,
  ...cellCallbacks
}: MatchesTableProps): JSX.Element {
  const defaultColumn = React.useMemo(
    () => ({
      disableFilters: true
    }),
    []
  );
  const columns: Column<MatchTableData>[] = React.useMemo(
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
      { accessor: "onThePlay" },
      {
        Header: "Flip",
        accessor: "isOnPlay",
        disableFilters: false,
        filter: "onPlay",
        Filter: OnPlayColumnFilter,
        Cell: OnPlayCell,
        gridWidth: "100px",
        mayToggle: true
      },
      {
        Header: "Event",
        accessor: "eventId",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Best of",
        accessor: "bestOf",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      { accessor: "gameStats" },
      { accessor: "toolVersion" },
      { accessor: "toolRunFromSource" },
      { accessor: "player" },
      {
        Header: "My Rank",
        accessor: "rank",
        disableFilters: false,
        filter: "rank",
        Filter: RankColumnFilter,
        Cell: RankCell,
        gridWidth: "140px",
        mayToggle: true
      },
      {
        Header: "My Tier",
        accessor: "tier",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "My Mythic %",
        accessor: "percentile",
        Cell: PercentCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "My Mythic #",
        accessor: "leaderboardPlace",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      { accessor: "playerDeck" },
      { accessor: "deckId" },
      {
        Header: "My Deck",
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
        Header: "My Colors",
        disableFilters: false,
        accessor: "colorSortVal",
        Filter: ColorColumnFilter,
        filter: "colors",
        Cell: ColorsCell,
        gridWidth: "150px",
        mayToggle: true
      },
      {
        Header: "My Tags",
        accessor: "deckTags",
        disableFilters: false,
        Filter: TextBoxFilter,
        filter: "fuzzyText",
        disableSortBy: true,
        Cell: TagsCell,
        gridWidth: "200px",
        mayToggle: true
      },
      { accessor: "opponent" },
      { accessor: "oppDeck" },
      {
        Header: "Opponent",
        accessor: "oppName",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Op. Rank",
        accessor: "oppRank",
        disableFilters: false,
        filter: "rank",
        Filter: RankColumnFilter,
        Cell: RankCell,
        gridWidth: "140px",
        mayToggle: true
      },
      {
        Header: "Op. Tier",
        accessor: "oppTier",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Op. Mythic %",
        accessor: "oppPercentile",
        Cell: PercentCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Op. Mythic #",
        accessor: "oppLeaderboardPlace",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      { accessor: "oppColors" },
      {
        Header: "Op. Colors",
        disableFilters: false,
        accessor: "oppColorSortVal",
        Filter: ColorColumnFilter,
        filter: "colors",
        Cell: ColorsCell,
        gridWidth: "150px",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "oppArchetype" },
      {
        Header: "Archetype",
        accessor: "tags",
        disableFilters: false,
        Filter: TextBoxFilter,
        filter: "fuzzyText",
        disableSortBy: true,
        Cell: MatchTagsCell,
        gridWidth: "200px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Duration",
        accessor: "duration",
        Cell: DurationCell,
        gridWidth: "100px",
        mayToggle: true
      },
      {
        Header: "Won",
        accessor: "wins",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Lost",
        accessor: "losses",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Drawn",
        accessor: "draws",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
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
      onPlay: onPlayFilterFn,
      rank: rankFilterFn,
      showArchived: archivedFilterFn
    }),
    []
  );
  const initialState: MatchesTableState = React.useMemo(() => {
    // default hidden columns
    const hiddenColumns = columns
      .filter(column => !column.defaultVisible)
      .map(column => column.id ?? column.accessor);
    // TODO cachedState
    const state = _.defaultsDeep(
      {},
      {
        hiddenColumns,
        filters: [{ id: "archivedCol", value: "hideArchived" }],
        sortBy: [{ id: "timestamp", desc: true }],
        pageSize: 25
      }
    );
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
      globalFilter: matchSearchFilterFn,
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false,
      ...cellCallbacks
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );
  const { filters, globalFilter, pageIndex, pageSize } = state;
  const [tableMode, setTableMode] = React.useState(cachedTableMode);

  React.useEffect(() => {
    tableStateCallback({ ...state, matchesTableMode: tableMode });
  }, [state, tableMode, tableStateCallback]);
  React.useEffect(() => {
    filterMatchesCallback(rows.map(row => row.original.id));
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

  const tableControlsProps: MatchesTableControlsProps = {
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
      <MatchesTableControls {...tableControlsProps} />
      <div className="decks_table_body" {...getTableBodyProps()}>
        {page.map((row, index) => {
          prepareRow(row);
          const data = row.original;
          if (tableMode === MATCHES_TABLE_MODE) {
            const onClick = (): void => openMatchCallback(data.id ?? "");
            return (
              <TableViewRow
                onClick={onClick}
                title={"show match details"}
                row={row}
                index={index}
                key={row.index}
                gridTemplateColumns={gridTemplateColumns}
              />
            );
          }
          return (
            <MatchesListViewRow
              row={row}
              index={index}
              key={row.index}
              gridTemplateColumns={gridTemplateColumns}
              tags={tags}
              openMatchCallback={openMatchCallback}
              {...cellCallbacks}
            />
          );
        })}
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}

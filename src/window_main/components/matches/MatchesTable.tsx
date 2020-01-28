import React from "react";
import { Column } from "react-table";
import { MATCHES_TABLE_MODE } from "../../../shared/constants";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  FormatCell,
  MetricCell,
  PercentCell,
  RelativeTimeCell,
  ShortTextCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import { useAggregatorArchiveFilter, useBaseReactTable } from "../tables/hooks";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { TableViewRow } from "../tables/TableViewRow";
import { BaseTableProps } from "../tables/types";
import { ArchetypeCell, OnPlayCell, RankCell } from "./cells";
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
  MatchTableData
} from "./types";

const columns: Column<MatchTableData>[] = [
  { accessor: "id" },
  { accessor: "date" },
  {
    Header: "Date",
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
  { accessor: "eventId" },
  {
    Header: "Event",
    accessor: "eventName",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: ShortTextCell,
    gridWidth: "200px",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Format",
    accessor: "format",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: FormatCell,
    gridWidth: "150px",
    mayToggle: true
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
    Cell: ArchetypeCell,
    gridWidth: "200px",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Duration",
    accessor: "duration",
    Cell: DurationCell,
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
    gridWidth: "110px",
    sortType: "basic",
    mayToggle: true
  }
];

export default function MatchesTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterDataCallback,
  openMatchCallback,
  ...customProps
}: MatchesTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback
  ]);
  const customFilterTypes = {
    onPlay: onPlayFilterFn,
    rank: rankFilterFn
  };
  const tableProps: BaseTableProps<MatchTableData> = {
    cachedState,
    columns,
    customFilterTypes,
    customProps,
    data,
    defaultState: {
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      sortBy: [{ id: "timestamp", desc: true }]
    },
    filterDataCallback,
    globalFilter: matchSearchFilterFn,
    setTableMode,
    tableMode,
    tableStateCallback
  };
  const {
    table,
    gridTemplateColumns,
    headersProps,
    pagingProps,
    tableControlsProps
  } = useBaseReactTable(tableProps);
  useAggregatorArchiveFilter(table, aggFilters, setAggFiltersCallback);
  const { getTableBodyProps, page, prepareRow } = table;
  const matchesTableControlsProps: MatchesTableControlsProps = {
    aggFilters,
    events,
    setAggFiltersCallback,
    ...tableControlsProps
  };
  const isTableMode = tableMode === MATCHES_TABLE_MODE;
  return (
    <div className="react_table_wrap">
      <MatchesTableControls {...matchesTableControlsProps} />
      <div
        className="med_scroll"
        style={isTableMode ? { overflowX: "auto" } : undefined}
      >
        <TableHeaders
          {...headersProps}
          style={
            isTableMode
              ? { width: "fit-content" }
              : { overflowX: "auto", overflowY: "hidden" }
          }
        />
        <div
          className={
            isTableMode ? "react_table_body" : "react_table_body_no_adjust"
          }
          {...getTableBodyProps()}
        >
          {page.map((row, index) => {
            prepareRow(row);
            const data = row.original;
            if (isTableMode) {
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
                openMatchCallback={openMatchCallback}
                {...customProps}
              />
            );
          })}
        </div>
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}

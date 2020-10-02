import React from "react";
import { Column, Row } from "react-table";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import ListItemMatch from "../list-item/ListItemMatch";
import MatchResultsStatsPanel from "../misc/MatchResultsStatsPanel";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  FormatCell,
  MetricCell,
  PercentCell,
  RelativeTimeCell,
  ShortTextCell,
  SubTextCell,
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter,
} from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { TableViewRow } from "../tables/TableViewRow";
import { BaseTableProps } from "../tables/types";
import { useAggregatorArchiveFilter } from "../tables/useAggregatorArchiveFilter";
import { useBaseReactTable } from "../tables/useBaseReactTable";
import { ArchetypeCell, OnPlayCell, RankCell } from "./cells";
import {
  matchSearchFilterFn,
  OnPlayColumnFilter,
  onPlayFilterFn,
  RankColumnFilter,
  rankFilterFn,
} from "./filters";
import MatchesTableControls from "./MatchesTableControls";
import RankedStats from "./RankedStats";
import {
  MatchesTableControlsProps,
  MatchesTableProps,
  MatchTableData,
} from "./types";
import { animated } from "react-spring";
import useResizePanel from "../../hooks/useResizePanel";

import indexCss from "../../index.css";
import tablesCss from "../tables/tables.css";
import sharedCss from "../../../shared/shared.css";
import { constants } from "mtgatool-shared";
const { DATE_SEASON, MATCHES_TABLE_MODE } = constants;

const { RANKED_CONST, RANKED_DRAFT } = Aggregator;

function convertRankToNumber(rank: string): number {
  switch (rank) {
    case 'Bronze':
      return 0;
    case 'Silver':
      return 1;
    case 'Gold':
      return 2;
    case 'Platinum':
      return 3;
    case 'Diamond':
      return 4;
    case 'Mythic':
      return 5;
    default:
      return -1;
  }
}

const columns: Column<MatchTableData>[] = [
  { accessor: "id" },
  { accessor: "date" },
  {
    Header: "Date",
    accessor: "timestamp",
    Cell: RelativeTimeCell,
    sortDescFirst: true,
    mayToggle: true,
    defaultVisible: true,
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
    mayToggle: true,
  },
  { accessor: "eventId" },
  {
    Header: "Event",
    accessor: "eventName",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: SubTextCell,
    gridWidth: "210px",
    mayToggle: true,
    defaultVisible: true,
  },
  {
    Header: "Format",
    accessor: "format",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: FormatCell,
    gridWidth: "150px",
    mayToggle: true,
  },
  {
    Header: "Best of",
    accessor: "bestOf",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
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
    mayToggle: true,
  },
  {
    Header: "My Tier",
    accessor: "tier",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
  },
  {
    Header: "My Mythic %",
    accessor: "percentile",
    Cell: PercentCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
  },
  {
    Header: "My Mythic #",
    accessor: "leaderboardPlace",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
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
    gridWidth: "210px",
    mayToggle: true,
    defaultVisible: true,
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
    mayToggle: true,
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
    gridWidth: "210px",
    mayToggle: true,
    defaultVisible: true,
  },
  {
    Header: "Op. ID",
    accessor: "oppArenaId",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: SubTextCell,
    gridWidth: "210px",
    mayToggle: true,
  },
  {
    Header: "Op. Rank",
    accessor: "oppRank",
    disableFilters: false,
    filter: "rank",
    Filter: RankColumnFilter,
    Cell: RankCell,
    mayToggle: true,
    sortType: (rowA, rowB) => {
      const rank = convertRankToNumber(rowA.original.oppRank) - convertRankToNumber(rowB.original.oppRank);
      return rank > 0 ? 1 : rank < 0 ? -1 : 0;
    }
  },
  {
    Header: "Op. Tier",
    accessor: "oppTier",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
  },
  {
    Header: "Op. Mythic %",
    accessor: "oppPercentile",
    Cell: PercentCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
  },
  {
    Header: "Op. Mythic #",
    accessor: "oppLeaderboardPlace",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
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
    defaultVisible: true,
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
    gridWidth: "210px",
    mayToggle: true,
    defaultVisible: true,
  },
  {
    Header: "Duration",
    accessor: "duration",
    Cell: DurationCell,
    mayToggle: true,
  },
  {
    Header: "Won",
    accessor: "wins",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
  },
  {
    Header: "Lost",
    accessor: "losses",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
  },
  {
    Header: "Drawn",
    accessor: "draws",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
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
    mayToggle: true,
  },
];

function getDataAggFilters(data: Row<MatchTableData>[]): AggregatorFilters {
  const matchIds = data.map((row) => row.original.id);
  return { matchIds };
}

function MatchesSidePanel({
  subAggFilters,
  setAggFiltersCallback,
}: {
  subAggFilters: AggregatorFilters;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
}): JSX.Element {
  const { date, eventId } = subAggFilters;
  const subAggregator = new Aggregator(subAggFilters);
  const isLimited = eventId === RANKED_DRAFT;
  const isConstructed = eventId === RANKED_CONST;
  const isCurrentSeason = date === DATE_SEASON;
  return (
    <>
      {isCurrentSeason && (isLimited || isConstructed) && (
        <div className={indexCss.ranksHistory} style={{ padding: "0 12px" }}>
          <div className={"ranks_stats"} style={{ paddingBottom: "16px" }}>
            <RankedStats
              aggregator={subAggregator}
              isLimited={isLimited}
              setAggFiltersCallback={setAggFiltersCallback}
            />
          </div>
        </div>
      )}
      <MatchResultsStatsPanel
        prefixId={indexCss.matchesTop}
        aggregator={subAggregator}
        showCharts
      />
    </>
  );
}

export default function MatchesTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  openMatchCallback,
  ...customProps
}: MatchesTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback,
  ]);
  const customFilterTypes = {
    onPlay: onPlayFilterFn,
    rank: rankFilterFn,
  };
  const tableProps: BaseTableProps<MatchTableData> = {
    cachedState,
    columns,
    customFilterTypes,
    customProps,
    data,
    defaultState: {
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      sortBy: [{ id: "timestamp", desc: true }],
    },
    globalFilter: matchSearchFilterFn,
    setTableMode,
    tableMode,
    tableStateCallback,
  };
  const {
    table,
    gridTemplateColumns,
    headersProps,
    pagingProps,
    tableControlsProps,
  } = useBaseReactTable(tableProps);
  useAggregatorArchiveFilter(table, aggFilters, setAggFiltersCallback);
  const { getTableBodyProps, page, prepareRow, rows } = table;
  const matchesTableControlsProps: MatchesTableControlsProps = {
    aggFilters,
    events,
    setAggFiltersCallback,
    ...tableControlsProps,
  };
  const isTableMode = tableMode === MATCHES_TABLE_MODE;

  const [width, bind] = useResizePanel();

  return (
    <>
      <div className={indexCss.wrapperColumn}>
        <div className={tablesCss.reactTableWrap}>
          <MatchesTableControls {...matchesTableControlsProps} />
          <div
            className={sharedCss.medScroll}
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
                isTableMode
                  ? tablesCss.reactTableBody
                  : tablesCss.reactTableBodyNoAdjust
              }
              {...getTableBodyProps()}
            >
              {page.map((row, index) => {
                prepareRow(row);
                const data = row.original;
                if (isTableMode) {
                  const onClick = (): void => openMatchCallback(data);
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
                  <ListItemMatch
                    match={row.original}
                    key={row.index}
                    openMatchCallback={openMatchCallback}
                    {...customProps}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: "10px" }}>
            <PagingControls {...pagingProps} />
          </div>
        </div>
      </div>

      <animated.div
        {...bind()}
        className={tablesCss.sidebarDragger}
      ></animated.div>
      <animated.div
        className={tablesCss.sidebarMain}
        style={{ width, minWidth: width, maxWidth: width }}
      >
        <MatchesSidePanel
          subAggFilters={{ ...aggFilters, ...getDataAggFilters(rows) }}
          setAggFiltersCallback={setAggFiltersCallback}
        />
      </animated.div>
    </>
  );
}

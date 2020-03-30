import React from "react";
import { Column, Row } from "react-table";
import { DECKS_ART_MODE, DECKS_TABLE_MODE } from "../../../shared/constants";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import { ListItemDeck } from "../list-item/ListItemDeck";
import MatchResultsStatsPanel from "../misc/MatchResultsStatsPanel";
import ResizableDragger from "../misc/ResizableDragger";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  FormatCell,
  MetricCell,
  RelativeTimeCell,
  ShortTextCell,
  TagsCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { TableViewRow } from "../tables/TableViewRow";
import { BaseTableProps } from "../tables/types";
import { useAggregatorArchiveFilter } from "../tables/useAggregatorArchiveFilter";
import { useBaseReactTable } from "../tables/useBaseReactTable";
import {
  BoosterNeededCell,
  BoosterNeededHeader,
  LastEditWinRateCell,
  WildcardCell,
  WildcardHeader,
  WinRateCell
} from "./cells";
import DecksArtViewRow from "./DecksArtViewRow";
import DecksTableControls from "./DecksTableControls";
import { deckSearchFilterFn } from "./filters";
import { DecksData, DecksTableControlsProps, DecksTableProps } from "./types";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared-redux/stores/rendererStore";

const columns: Column<DecksData>[] = [
  { accessor: "id" },
  { id: "deckId", accessor: "id" },
  { accessor: "deckTileId" },
  {
    Header: "Name",
    accessor: "name",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: ShortTextCell,
    gridWidth: "210px",
    defaultVisible: true
  },
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
  { accessor: "colors" },
  {
    Header: "Format",
    accessor: "format",
    disableFilters: false,
    Filter: TextBoxFilter,
    filter: "fuzzyText",
    Cell: FormatCell,
    gridWidth: "150px",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Tags",
    accessor: "tags",
    disableFilters: false,
    Filter: TextBoxFilter,
    filter: "fuzzyText",
    disableSortBy: true,
    Cell: TagsCell,
    gridWidth: "240px",
    mayToggle: true
  },
  {
    Header: "Last Updated",
    accessor: "timeUpdated",
    Cell: RelativeTimeCell,
    sortDescFirst: true,
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Last Played",
    accessor: "timePlayed",
    Cell: RelativeTimeCell,
    sortDescFirst: true,
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Last Touched",
    accessor: "timeTouched",
    Cell: RelativeTimeCell,
    sortDescFirst: true,
    mayToggle: true,
    defaultVisible: true,
    needsTileLabel: true
  },
  {
    Header: "Won",
    accessor: "wins",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Lost",
    accessor: "losses",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Total",
    accessor: "total",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Total Duration",
    accessor: "duration",
    Cell: DurationCell,
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Avg. Duration",
    accessor: "avgDuration",
    Cell: DurationCell,
    mayToggle: true,
    needsTileLabel: true
  },
  {
    Header: "Winrate",
    accessor: "winrate100",
    Cell: WinRateCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
    needsTileLabel: true
  },
  { accessor: "winrate" },
  { accessor: "interval", sortInverted: true },
  { accessor: "winrateLow" },
  { accessor: "winrateHigh" },
  {
    Header: "Since last edit",
    accessor: "lastEditWinrate",
    Cell: LastEditWinRateCell,
    mayToggle: true,
    needsTileLabel: true
  },
  { accessor: "lastEditWins" },
  { accessor: "lastEditLosses" },
  { accessor: "lastEditTotal" },
  {
    Header: BoosterNeededHeader,
    accessor: "boosterCost",
    Cell: BoosterNeededCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    gridWidth: "100px",
    mayToggle: true
  },
  {
    Header: WildcardHeader,
    accessor: "mythic",
    Cell: WildcardCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    gridWidth: "100px",
    mayToggle: true
  },
  {
    Header: WildcardHeader,
    accessor: "rare",
    Cell: WildcardCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    gridWidth: "100px",
    mayToggle: true
  },
  {
    Header: WildcardHeader,
    accessor: "uncommon",
    Cell: WildcardCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    gridWidth: "100px",
    mayToggle: true
  },
  {
    Header: WildcardHeader,
    accessor: "common",
    Cell: WildcardCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    gridWidth: "100px",
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
    mayToggle: true,
    defaultVisible: true
  }
];

function getDataAggFilters(data: Row<DecksData>[]): AggregatorFilters {
  const deckId = data.map(row => row.original.id).filter(id => id) as string[];
  return { deckId };
}

export default function DecksTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  openDeckCallback,
  ...customProps
}: DecksTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback
  ]);
  const tags = React.useMemo(() => {
    const tagCounts: { [tag: string]: number } = {};
    for (const deck of data) {
      deck.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      });
    }
    return Object.entries(tagCounts).map(([tag, q]) => {
      return { tag, q };
    });
  }, [data]);
  const tableProps: BaseTableProps<DecksData> = {
    cachedState,
    columns,
    customProps: { ...customProps, tags },
    data,
    defaultState: {
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      sortBy: [{ id: "timeTouched", desc: true }]
    },
    globalFilter: deckSearchFilterFn,
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

  const { getTableBodyProps, page, prepareRow, rows } = table;
  const decksTableControlsProps: DecksTableControlsProps = {
    aggFilters,
    events,
    setAggFiltersCallback,
    ...tableControlsProps
  };

  const isTableMode = tableMode === DECKS_TABLE_MODE;
  const panelWidth = useSelector(
    (state: AppState) => state.settings.right_panel_width
  );
  const sidePanelWidth = panelWidth + "px";
  return (
    <>
      <div className={"wrapper_column"}>
        <div className="react_table_wrap">
          <DecksTableControls {...decksTableControlsProps} />
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
                  const onClick = (): void => openDeckCallback(data);
                  return (
                    <TableViewRow
                      onClick={onClick}
                      title={"show deck details"}
                      row={row}
                      index={index}
                      key={row.index}
                      gridTemplateColumns={gridTemplateColumns}
                    />
                  );
                }
                const RowRenderer =
                  tableMode === DECKS_ART_MODE ? DecksArtViewRow : ListItemDeck;
                return (
                  <RowRenderer
                    row={row}
                    index={index}
                    key={row.index}
                    gridTemplateColumns={gridTemplateColumns}
                    openDeckCallback={openDeckCallback}
                    tags={tags}
                    {...customProps}
                  />
                );
              })}
            </div>
          </div>
          <PagingControls {...pagingProps} />
        </div>
      </div>
      <div
        className={"wrapper_column sidebar_column_l"}
        style={{
          width: sidePanelWidth,
          flex: `0 0 ${sidePanelWidth}`
        }}
      >
        <ResizableDragger />
        <MatchResultsStatsPanel
          prefixId={"decks_top"}
          aggregator={
            new Aggregator({ ...aggFilters, ...getDataAggFilters(rows) })
          }
          showCharts
        />
      </div>
    </>
  );
}

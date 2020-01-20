import React from "react";
import { Column } from "react-table";
import { DECKS_TABLE_MODE } from "../../../shared/constants";
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
import { useBaseReactTable } from "../tables/hooks";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { TableViewRow } from "../tables/TableViewRow";
import { BaseTableProps } from "../tables/types";
import { LastEditWinRateCell, MissingCardsCell, WinRateCell } from "./cells";
import DecksArtViewRow from "./DecksArtViewRow";
import DecksTableControls from "./DecksTableControls";
import { deckSearchFilterFn } from "./filters";
import { DecksData, DecksTableControlsProps, DecksTableProps } from "./types";

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
    sortType: "alphanumeric",
    Cell: ShortTextCell,
    gridWidth: "200px",
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
    gridWidth: "2fr",
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
    defaultVisible: true,
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
    Header: "Booster Cost",
    accessor: "boosterCost",
    Cell: MissingCardsCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true
  },
  { accessor: "rare" },
  { accessor: "common" },
  { accessor: "uncommon" },
  { accessor: "mythic" },
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
    mayToggle: true,
    defaultVisible: true
  }
];

export default function DecksTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterDataCallback,
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
    filterDataCallback,
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
  const { getTableBodyProps, page, prepareRow } = table;
  const decksTableControlsProps: DecksTableControlsProps = {
    aggFilters,
    events,
    setAggFiltersCallback,
    ...tableControlsProps
  };
  const isTableMode = tableMode === DECKS_TABLE_MODE;
  return (
    <div className="decks_table_wrap">
      <DecksTableControls {...decksTableControlsProps} />
      <div style={isTableMode ? { overflowX: "auto" } : undefined}>
        <TableHeaders
          {...headersProps}
          style={
            isTableMode ? undefined : { overflowX: "auto", overflowY: "hidden" }
          }
        />
        <div className="decks_table_body" {...getTableBodyProps()}>
          {page.map((row, index) => {
            prepareRow(row);
            const data = row.original;
            const RowRenderer = isTableMode ? TableViewRow : DecksArtViewRow;
            const onClick = (): void => openDeckCallback(data.id ?? "");
            return (
              <RowRenderer
                onClick={onClick}
                title={`show ${data.name} details`}
                row={row}
                index={index}
                key={row.index}
                gridTemplateColumns={gridTemplateColumns}
              />
            );
          })}
        </div>
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}

import React, { useMemo } from "react";
import { Column, Filters, FilterValue, IdType, Row } from "react-table";
import {
  COLLECTION_CARD_MODE,
  COLLECTION_CHART_MODE,
  COLLECTION_SETS_MODE,
  COLLECTION_TABLE_MODE,
  DRAFT_RANKS
} from "../../../shared/constants";
import db from "../../../shared/database";
import pd from "../../../shared/PlayerData";
import { getCollectionStats } from "./collectionStats";
import ResizableDragger from "../misc/ResizableDragger";
import { ColorsCell, MetricCell, ShortTextCell } from "../tables/cells";
import {
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import { useBaseReactTable } from "../tables/hooks";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { BaseTableProps } from "../tables/types";
import {
  InBoostersCell,
  InBoostersHeader,
  RarityCell,
  SetCell,
  TypeCell
} from "./cells";
import ChartView from "./ChartView";
import { CollectionStatsPanel } from "./CollectionStatsPanel";
import CollectionTableControls from "./CollectionTableControls";
import {
  cardSearchFilterFn,
  InBoostersColumnFilter,
  inBoostersFilterFn,
  RarityColumnFilter,
  rarityFilterFn,
  SetColumnFilter,
  setFilterFn
} from "./filters";
import { CardTableViewRow, CardTileRow } from "./rows";
import { SetsView } from "./SetCompletionView";
import {
  CardsData,
  CollectionTableControlsProps,
  CollectionTableProps
} from "./types";
import { useSelector } from "react-redux";
import { AppState, collectionSlice } from "../../../shared/redux/reducers";

function isBoosterMathValid(filters: Filters<CardsData>): boolean {
  let hasCorrectBoosterFilter = false;
  let hasCorrectRarityFilter = true;
  for (const filter of filters) {
    if (filter.id === "booster") {
      hasCorrectBoosterFilter = filter.value?.true && !filter.value?.false;
    } else if (filter.id === "rarity") {
      hasCorrectRarityFilter = filter.value?.mythic && filter.value?.rare;
    } else if (filter.id === "set") {
      continue; // this is fine
    } else {
      return false; // no other filters allowed
    }
  }
  return hasCorrectBoosterFilter && hasCorrectRarityFilter;
}

export default function CollectionTable({
  data,
  contextMenuCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  exportCallback,
  openCardCallback
}: CollectionTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  const cardSize = useSelector((state: AppState) => state.settings.cards_size);
  const sortedSetCodes = useMemo(() => db.sortedSetCodes, []);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback
  ]);

  const customFilterTypes = {
    inBoosters: inBoostersFilterFn,
    rarity: rarityFilterFn,
    set: setFilterFn
  };

  // Memoize the sort functions only once
  const setSortType = React.useCallback(
    (
      rowA: Row<CardsData>,
      rowB: Row<CardsData>,
      columnId: IdType<CardsData>
    ): 0 | 1 | -1 => {
      const indexDiff =
        sortedSetCodes.indexOf(rowA.values[columnId]) -
        sortedSetCodes.indexOf(rowB.values[columnId]);
      return indexDiff < 0 ? -1 : indexDiff > 0 ? 1 : 0;
    },
    [sortedSetCodes]
  );

  const rankSortType = React.useCallback(
    (
      rowA: Row<CardsData>,
      rowB: Row<CardsData>,
      columnId: IdType<CardsData>
    ): 0 | 1 | -1 => {
      const indexDiff =
        DRAFT_RANKS.indexOf(rowA.values[columnId]) -
        DRAFT_RANKS.indexOf(rowB.values[columnId]);
      return indexDiff < 0 ? -1 : indexDiff > 0 ? 1 : 0;
    },
    []
  );

  const raritySortType = React.useCallback(
    (
      rowA: Row<CardsData>,
      rowB: Row<CardsData>,
      columnId: IdType<CardsData>
    ): 0 | 1 | -1 => {
      const orderedRarity = ["land", "common", "uncommon", "rare", "mythic"];
      const indexDiff =
        orderedRarity.indexOf(rowA.values[columnId]) -
        orderedRarity.indexOf(rowB.values[columnId]);
      return indexDiff < 0 ? -1 : indexDiff > 0 ? 1 : 0;
    },
    []
  );

  const columns: Column<CardsData>[] = useMemo(
    () => [
      { id: "grpId", accessor: "id" },
      { accessor: "id" },
      { accessor: "dfc" },
      { accessor: "dfcId" },
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
        Header: "CMC",
        accessor: "cmc",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Type",
        accessor: "type",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: TypeCell,
        gridWidth: "230px",
        mayToggle: true
      },
      {
        Header: "Set",
        accessor: "set",
        disableFilters: false,
        filter: "set",
        Filter: SetColumnFilter,
        sortType: setSortType,
        sortInverted: true,
        sortDescFirst: true,
        Cell: SetCell,
        gridWidth: "230px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Rarity",
        disableFilters: false,
        accessor: "rarity",
        Filter: RarityColumnFilter,
        filter: "rarity",
        sortType: raritySortType,
        sortDescFirst: true,
        Cell: RarityCell,
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Owned",
        accessor: "owned",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Acquired",
        accessor: "acquired",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Wanted",
        accessor: "wanted",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Artist",
        accessor: "artist",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true
      },
      { accessor: "collectible" },
      { accessor: "craftable" },
      {
        Header: InBoostersHeader,
        accessor: "booster",
        disableFilters: false,
        filter: "inBoosters",
        Filter: InBoostersColumnFilter,
        Cell: InBoostersCell,
        gridWidth: "100px",
        mayToggle: true
      },
      {
        Header: "Rank",
        accessor: "rankSortVal",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        sortType: rankSortType,
        sortDescFirst: true,
        gridWidth: "100px",
        mayToggle: true
      },
      { accessor: "rank" },
      { accessor: "rank_controversy" },
      { accessor: "images" },
      { accessor: "reprints" }
    ],
    [rankSortType, raritySortType, setSortType]
  );
  const tableProps: BaseTableProps<CardsData> = {
    cachedState,
    columns,
    customFilterTypes,
    data,
    defaultState: {
      filters: [
        {
          id: "booster",
          value: {
            true: true,
            false: true
          }
        }
      ],
      sortBy: [{ id: "grpId", desc: true }]
    },
    globalFilter: cardSearchFilterFn,
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
  const {
    getTableBodyProps,
    page,
    prepareRow,
    rows,
    setAllFilters,
    setFilter,
    toggleHideColumn
  } = table;
  const setClickCallback = React.useCallback(
    (set: string) => {
      setTableMode(COLLECTION_CHART_MODE);
      setFilter("set", { [set]: true });
      toggleHideColumn("set", false);
    },
    [setFilter, toggleHideColumn]
  );
  const cardIds = rows.map(row => row.values.id);
  const stats = getCollectionStats(cardIds);
  const boosterMath =
    isBoosterMathValid(table.state.filters) &&
    tableMode === COLLECTION_SETS_MODE;

  const collectionTableControlsProps: CollectionTableControlsProps = {
    exportCallback,
    rows,
    ...tableControlsProps
  };
  const isTableMode = tableMode === COLLECTION_TABLE_MODE;
  const tableBody =
    tableMode === COLLECTION_CHART_MODE ? (
      <ChartView stats={stats} />
    ) : tableMode === COLLECTION_SETS_MODE ? (
      <SetsView
        stats={stats}
        boosterMath={boosterMath}
        setClickCallback={setClickCallback}
      />
    ) : (
      <div
        style={
          isTableMode
            ? {}
            : {
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(${100 +
                  cardSize * 15 +
                  12}px, 1fr))`
              }
        }
        className={
          isTableMode ? "react_table_body" : "react_table_body_no_adjust"
        }
        {...getTableBodyProps()}
      >
        {page.map((row, index) => {
          prepareRow(row);
          const RowRenderer = isTableMode ? CardTableViewRow : CardTileRow;
          return (
            <RowRenderer
              key={row.index}
              row={row}
              index={index}
              contextMenuCallback={contextMenuCallback}
              openCardCallback={openCardCallback}
              gridTemplateColumns={gridTemplateColumns}
            />
          );
        })}
      </div>
    );
  const { right_panel_width: panelWidth } = pd.settings;
  const sidePanelWidth = panelWidth + "px";
  const clickCompletionCallback = React.useCallback((): void => {
    setTableMode(COLLECTION_SETS_MODE);
    setAllFilters((): FilterValue[] => [
      { id: "booster", value: { true: true, false: false } }
    ]);
  }, [setAllFilters]);
  return (
    <>
      <div className={"wrapper_column"}>
        <div className="react_table_wrap">
          <CollectionTableControls {...collectionTableControlsProps} />
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
            {tableBody}
          </div>
          {[COLLECTION_CARD_MODE, COLLECTION_TABLE_MODE].includes(
            tableMode
          ) && <PagingControls {...pagingProps} />}
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
        <CollectionStatsPanel
          stats={stats}
          boosterMath={boosterMath}
          clickCompletionCallback={clickCompletionCallback}
        />
      </div>
    </>
  );
}

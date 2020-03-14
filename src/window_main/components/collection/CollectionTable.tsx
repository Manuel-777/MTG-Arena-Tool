import React, { useMemo } from "react";
import { Column, Filters, FilterValue } from "react-table";
import {
  COLLECTION_CARD_MODE,
  COLLECTION_CHART_MODE,
  COLLECTION_SETS_MODE,
  COLLECTION_TABLE_MODE,
  DRAFT_RANKS
} from "../../../shared/constants";
import db from "../../../shared/database";
import pd from "../../../shared/PlayerData";
import {
  ALL_CARDS,
  getCollectionStats
} from "../../collection/collectionStats";
import ResizableDragger from "../ResizableDragger";
import { ColorsCell, MetricCell, ShortTextCell } from "../tables/cells";
import {
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import { useBaseReactTable, useEnumSort } from "../tables/hooks";
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
import {
  saveTableMode,
  saveTableState,
  getCollectionData
} from "../../collection/CollectionTab";

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
  cachedState,
  cachedTableMode
}: CollectionTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  const [countMode, setCountMode] = React.useState(ALL_CARDS);
  const [rareDraftFactor, setRareDraftFactor] = React.useState(3);
  const [mythicDraftFactor, setMythicDraftFactor] = React.useState(0.14);
  const [boosterWinFactor, setBoosterWinFactor] = React.useState(1.2);
  const [futureBoosters, setFutureBoosters] = React.useState(0);
  const data = useMemo(() => getCollectionData(), []);

  React.useEffect(() => saveTableMode(tableMode), [tableMode]);

  const customFilterTypes = useMemo(() => {
    return {
      inBoosters: inBoostersFilterFn,
      rarity: rarityFilterFn,
      set: setFilterFn
    };
  }, []);

  const setSortType = useEnumSort<CardsData>(db.sortedSetCodes);
  const raritySortType = useEnumSort<CardsData>([
    "land", // needs custom order, does not use constants.CARD_RARITIES
    "common",
    "uncommon",
    "rare",
    "mythic"
  ]);
  const rankSortType = useEnumSort<CardsData>(DRAFT_RANKS);

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
    [setSortType, raritySortType, rankSortType]
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
            false: false
          }
        }
      ],
      sortBy: [{ id: "grpId", desc: true }]
    },
    globalFilter: cardSearchFilterFn,
    setTableMode,
    tableMode,
    tableStateCallback: saveTableState
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
        setClickCallback={setClickCallback}
        countMode={countMode}
        boosterMath={boosterMath}
        rareDraftFactor={rareDraftFactor}
        mythicDraftFactor={mythicDraftFactor}
        boosterWinFactor={boosterWinFactor}
        futureBoosters={futureBoosters}
      />
    ) : (
      <div
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
          countMode={countMode}
          boosterMath={boosterMath}
          rareDraftFactor={rareDraftFactor}
          mythicDraftFactor={mythicDraftFactor}
          boosterWinFactor={boosterWinFactor}
          futureBoosters={futureBoosters}
          setCountMode={setCountMode}
          setRareDraftFactor={setRareDraftFactor}
          setMythicDraftFactor={setMythicDraftFactor}
          setBoosterWinFactor={setBoosterWinFactor}
          setFutureBoosters={setFutureBoosters}
          clickCompletionCallback={clickCompletionCallback}
        />
      </div>
    </>
  );
}

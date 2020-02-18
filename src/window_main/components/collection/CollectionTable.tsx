import React from "react";
import { Column } from "react-table";
import {
  COLLECTION_CHART_MODE,
  COLLECTION_SETS_MODE,
  COLLECTION_TABLE_MODE,
  DRAFT_RANKS
} from "../../../shared/constants";
import db from "../../../shared/database";
import { createDiv } from "../../../shared/dom-fns";
import {
  CollectionStats,
  createWantedStats,
  getCollectionStats,
  renderSetStats
} from "../../collection/collectionStats";
import createHeatMap from "../../collection/completionHeatMap";
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
import {
  CardsData,
  CollectionTableControlsProps,
  CollectionTableProps
} from "./types";

const legacyModes = [COLLECTION_CHART_MODE, COLLECTION_SETS_MODE];

function renderSetView(
  container: HTMLElement,
  stats: CollectionStats,
  setClickCallback: (set: string) => void
): void {
  const setsContainer = createDiv(["main_stats"]);
  db.sortedSetCodes.forEach(set => {
    // If the set has a collationId, it means boosters for it exists
    if (!db.sets[set]?.collation) {
      return; // skip non-booster sets
    }
    const setStats = stats[set];
    const cardData = setStats.cards;
    if (cardData.length > 0) {
      const setContainer = createDiv(["set_stats"]);
      setContainer.addEventListener("click", () => setClickCallback(set));
      const rs = renderSetStats(setStats, set, set);
      setContainer.appendChild(rs);
      createWantedStats(setContainer, setStats);
      setsContainer.appendChild(setContainer);
    }
  });
  container.appendChild(setsContainer);
}

function renderHeatMaps(container: HTMLElement, stats: CollectionStats): void {
  const chartContainer = createDiv(["main_stats"]);
  db.sortedSetCodes.forEach(set => {
    const cardData = stats[set].cards;
    if (cardData.length > 0) {
      createHeatMap(chartContainer, cardData, set);
    }
  });
  container.appendChild(chartContainer);
}

function updateLegacyViews(
  container: HTMLElement,
  stats: CollectionStats,
  displayMode: string,
  setClickCallback: (set: string) => void
): void {
  if (!legacyModes.includes(displayMode)) {
    return;
  }
  container.innerHTML = "";
  switch (displayMode) {
    default:
    case COLLECTION_CHART_MODE:
      renderHeatMaps(container, stats);
      break;
    case COLLECTION_SETS_MODE:
      renderSetView(container, stats, setClickCallback);
      break;
  }
}

export default function CollectionTable({
  data,
  cardHoverCallback,
  contextMenuCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterDataCallback,
  exportCallback,
  openCardCallback
}: CollectionTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback
  ]);
  const customFilterTypes = {
    inBoosters: inBoostersFilterFn,
    rarity: rarityFilterFn,
    set: setFilterFn
  };
  const columns: Column<CardsData>[] = [
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
      sortType: useEnumSort<CardsData>(db.sortedSetCodes),
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
      sortType: useEnumSort<CardsData>([
        "land", // needs custom order, does not use constants.CARD_RARITIES
        "common",
        "uncommon",
        "rare",
        "mythic"
      ]),
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
      sortType: useEnumSort<CardsData>(DRAFT_RANKS),
      sortDescFirst: true,
      gridWidth: "100px",
      mayToggle: true
    },
    { accessor: "rank" },
    { accessor: "rank_controversy" },
    { accessor: "images" },
    { accessor: "reprints" }
  ];
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
    filterDataCallback,
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
    setFilter,
    toggleHideColumn
  } = table;

  const legacyContainerRef = React.useRef<HTMLDivElement>(null);
  const setClickCallback = React.useCallback(
    (set: string) => {
      setTableMode(COLLECTION_CHART_MODE);
      setFilter("set", { [set]: true });
      toggleHideColumn("set", false);
    },
    [setFilter, toggleHideColumn]
  );
  React.useEffect(() => {
    const cardIds = rows.map(row => row.values.id);
    if (legacyContainerRef?.current) {
      const stats = getCollectionStats(cardIds);
      updateLegacyViews(
        legacyContainerRef.current,
        stats,
        tableMode,
        setClickCallback
      );
    }
  }, [tableMode, rows, legacyContainerRef, setClickCallback]);

  const collectionTableControlsProps: CollectionTableControlsProps = {
    exportCallback,
    rows,
    ...tableControlsProps
  };
  const isTableMode = tableMode === COLLECTION_TABLE_MODE;
  const tableBody = legacyModes.includes(tableMode) ? (
    <div
      className={
        isTableMode ? "react_table_body" : "react_table_body_no_adjust"
      }
      {...getTableBodyProps()}
    >
      <div ref={legacyContainerRef} />
    </div>
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
            cardHoverCallback={cardHoverCallback}
            contextMenuCallback={contextMenuCallback}
            openCardCallback={openCardCallback}
            gridTemplateColumns={gridTemplateColumns}
          />
        );
      })}
    </div>
  );
  return (
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
      {!legacyModes.includes(tableMode) && <PagingControls {...pagingProps} />}
    </div>
  );
}

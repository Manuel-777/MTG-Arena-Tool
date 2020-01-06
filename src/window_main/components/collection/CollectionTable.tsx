/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
import _ from "lodash";
import React from "react";

import {
  COLLECTION_TABLE_MODE,
  COLLECTION_CHART_MODE,
  COLLECTION_SETS_MODE
} from "../../../shared/constants";
import { createDiv } from "../../../shared/dom-fns";
import db from "../../../shared/database";
import PagingControls, { PagingControlsProps } from "../PagingControls";
import { ShortTextCell, ColorsCell, MetricCell } from "../decks/cells";
import {
  TextBoxFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  fuzzyTextFilterFn,
  colorsFilterFn
} from "../decks/filters";
import {
  CollectionStats,
  getCollectionStats,
  renderSetStats,
  createWantedStats
} from "../../collection/collectionStats";
import createHeatMap from "../../collection/completionHeatMap";
import CollectionTableControls from "./CollectionTableControls";
import { CardTableViewRow, CardTileRow } from "./rows";
import { RarityCell, SetCell, TypeCell } from "./cells";
import {
  RarityColumnFilter,
  rarityFilterFn,
  cardSearchFilterFn,
  setFilterFn,
  SetColumnFilter
} from "./filters";
import {
  CollectionTableProps,
  CollectionTableState,
  CollectionTableControlsProps
} from "./types";

const ReactTable = require("react-table"); // no @types package for current rc yet

const legacyModes = [COLLECTION_CHART_MODE, COLLECTION_SETS_MODE];

function renderSetView(
  container: HTMLElement,
  stats: CollectionStats,
  setClickCallback: (set: string) => void
): void {
  const setsContainer = createDiv(["main_stats", "sub_stats"]);
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
  const chartContainer = createDiv(["main_stats", "sub_stats"]);
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
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterCallback,
  exportCallback,
  openCardCallback
}: CollectionTableProps): JSX.Element {
  const defaultColumn = React.useMemo(
    () => ({
      disableFilters: true
    }),
    []
  );
  const columns = React.useMemo(
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
        sortType: "alphanumeric",
        Cell: ShortTextCell,
        gridWidth: "200px",
        defaultVisible: true
      },
      { accessor: "colors" },
      {
        Header: "Colors",
        disableFilters: false,
        accessor: "colorSortVal",
        Filter: ColorColumnFilter,
        filter: "colors",
        minWidth: 170,
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
        sortType: "alphanumeric",
        Cell: TypeCell,
        gridWidth: "250px",
        mayToggle: true
      },
      {
        Header: "Set",
        accessor: "set",
        disableFilters: false,
        filter: "set",
        Filter: SetColumnFilter,
        sortType: "alphanumeric",
        Cell: SetCell,
        gridWidth: "200px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Rarity",
        disableFilters: false,
        accessor: "rarity",
        Filter: RarityColumnFilter,
        filter: "rarity",
        minWidth: 170,
        Cell: RarityCell,
        gridWidth: "140px",
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
        sortType: "alphanumeric",
        Cell: ShortTextCell,
        gridWidth: "200px",
        mayToggle: true
      },
      { accessor: "collectible" },
      { accessor: "craftable" },
      {
        Header: "In Boosters",
        accessor: "boosterSortVal",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        sortType: "alphanumeric",
        mayToggle: true
      },
      { accessor: "booster" },
      {
        Header: "Rank",
        accessor: "rankSortVal",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        sortType: "alphanumeric",
        mayToggle: true
      },
      { accessor: "rank" },
      { accessor: "rank_controversy" },
      { accessor: "images" },
      { accessor: "reprints" }
    ],
    []
  );
  const filterTypes = React.useMemo(
    () => ({
      fuzzyText: fuzzyTextFilterFn,
      colors: colorsFilterFn,
      rarity: rarityFilterFn,
      set: setFilterFn
    }),
    []
  );
  const initialState: CollectionTableState = React.useMemo(() => {
    // default hidden columns
    const hiddenColumns = columns
      .filter(column => !column.defaultVisible)
      .map(column => column.id ?? column.accessor);
    const state = _.defaultsDeep(cachedState, {
      hiddenColumns,
      filters: [{ id: "boosterSortVal", value: "yes" }],
      sortBy: [{ id: "grpId", desc: true }],
      pageSize: 25
    });
    // ensure data-only columns are all invisible
    for (const column of columns) {
      if (!column.defaultVisible && !column.mayToggle) {
        state.hiddenColumns.push(column.id ?? column.accessor);
      }
    }
    return state;
  }, [cachedState]);

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
  } = ReactTable.useTable(
    {
      columns,
      data: React.useMemo(() => data, [data]),
      defaultColumn,
      filterTypes,
      globalFilter: cardSearchFilterFn,
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false
    },
    ReactTable.useFilters,
    ReactTable.useGlobalFilter,
    ReactTable.useSortBy,
    ReactTable.usePagination
  );
  const { filters, globalFilter, pageIndex, pageSize } = state;
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  const legacyContainerRef = React.useRef<HTMLDivElement>(null);

  const setClickCallback = React.useCallback((set: string) => {
    setTableMode(COLLECTION_CHART_MODE);
    setFilter("set", { [set]: true });
    toggleHideColumn("set", false);
  }, []);
  React.useEffect(() => {
    tableStateCallback({ ...state, collectionTableMode: tableMode });
  }, [state, tableMode, tableStateCallback]);
  React.useEffect(() => {
    const cardIds = rows.map((row: any) => row.values.id);
    filterCallback(cardIds);
  }, [filterCallback, rows]);
  React.useEffect(() => {
    const cardIds = rows.map((row: any) => row.values.id);
    if (legacyContainerRef?.current) {
      const stats = getCollectionStats(cardIds);
      updateLegacyViews(
        legacyContainerRef.current,
        stats,
        tableMode,
        setClickCallback
      );
    }
  }, [tableMode, rows, legacyContainerRef]);

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

  const visibleHeaders = headers.filter((header: any) => header.isVisible);
  const gridTemplateColumns = visibleHeaders
    .map((header: any) => header.gridWidth ?? "1fr")
    .join(" ");

  const tableControlsProps: CollectionTableControlsProps = {
    canNextPage,
    canPreviousPage,
    exportCallback,
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
    rows,
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

  const tableBody = legacyModes.includes(tableMode) ? (
    <div className="decks_table_body" {...getTableBodyProps()}>
      <div ref={legacyContainerRef} />
    </div>
  ) : (
    <div className="decks_table_body" {...getTableBodyProps()}>
      {page.map((row: any, index: number) => {
        prepareRow(row);
        const RowRenderer =
          tableMode === COLLECTION_TABLE_MODE ? CardTableViewRow : CardTileRow;
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
    <div className="decks_table_wrap">
      <CollectionTableControls {...tableControlsProps} />
      {tableBody}
      {!legacyModes.includes(tableMode) && <PagingControls {...pagingProps} />}
    </div>
  );
}

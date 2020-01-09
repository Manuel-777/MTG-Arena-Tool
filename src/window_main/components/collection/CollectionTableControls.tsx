import React from "react";
import { FilterValue } from "react-table";
import {
  COLLECTION_CHART_MODE,
  COLLECTION_SETS_MODE,
  COLLECTION_TABLE_MODES
} from "../../../shared/constants";
import db from "../../../shared/database";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import {
  CheckboxContainer,
  MediumTextButton,
  SmallTextButton
} from "../display";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { FiltersVisible } from "../tables/types";
import { CollectionTableControlsProps } from "./types";

const standardSetsFilter: FilterValue = {};
db.standardSetCodes.forEach(code => (standardSetsFilter[code] = true));
const standardFilters = (): FilterValue[] => [
  { id: "set", value: standardSetsFilter }
];
const ownedFilters = (): FilterValue[] => [
  { id: "owned", value: [1, undefined] }
];
const wantedFilters = (): FilterValue[] => [
  { id: "wanted", value: [1, undefined] }
];

const legacyModes = [COLLECTION_CHART_MODE, COLLECTION_SETS_MODE];

export default function CollectionTableControls({
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
}: CollectionTableControlsProps): JSX.Element {
  const [toggleableColumns, initialFiltersVisible] = React.useMemo(() => {
    const toggleableColumns = flatColumns.filter(column => column.mayToggle);
    const initialFiltersVisible: FiltersVisible = {};
    for (const column of flatColumns) {
      if (column.canFilter) {
        initialFiltersVisible[column.id] = !!column.filterValue;
      }
    }
    return [toggleableColumns, initialFiltersVisible];
  }, [flatColumns]);

  const [filtersVisible, setFiltersVisible] = React.useState(
    initialFiltersVisible
  );
  const [togglesVisible, setTogglesVisible] = React.useState(false);
  const exportRows = React.useCallback(() => {
    exportCallback(rows.map(row => row.values.id));
  }, [rows]);

  const inBoostersOnly = React.useMemo(
    () =>
      filters.some(
        filter => filter.id === "boosterSortVal" && filter.value === "yes"
      ),
    [filters]
  );

  const pagingProps = {
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
  const headersProps = {
    filtersVisible,
    getTableProps,
    gridTemplateColumns,
    setFilter,
    setFiltersVisible,
    visibleHeaders
  };
  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          color: "var(--color-light)",
          paddingBottom: "8px"
        }}
      >
        <div className="decks_table_toggles">
          <CheckboxContainer title={"In boosters only"}>
            <div className={"icon_search_booster"} />
            <input
              type="checkbox"
              checked={inBoostersOnly}
              onChange={(): void => {
                setFilter("boosterSortVal", inBoostersOnly ? undefined : "yes");
              }}
            />
            <span className={"checkmark"} />
          </CheckboxContainer>
          <span style={{ paddingBottom: "8px" }}>Presets:</span>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(standardFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                set: true
              });
              toggleSortBy("grpId", true, false);
              for (const column of toggleableColumns) {
                const isVisible = [
                  "colorSortVal",
                  "cmc",
                  "set",
                  "rarity",
                  "owned"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Standard
          </SmallTextButton>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(ownedFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                owned: true
              });
              toggleSortBy("grpId", true, false);
              for (const column of toggleableColumns) {
                const isVisible = [
                  "colorSortVal",
                  "cmc",
                  "set",
                  "rarity",
                  "owned"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Owned
          </SmallTextButton>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(wantedFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                wanted: true
              });
              toggleSortBy("grpId", true, false);
              for (const column of toggleableColumns) {
                const isVisible = [
                  "colorSortVal",
                  "cmc",
                  "set",
                  "rarity",
                  "wanted"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Wanted
          </SmallTextButton>
          <MediumTextButton
            onClick={(): void => setTogglesVisible(!togglesVisible)}
            className="button_simple"
            style={{ margin: "0 0 5px 12px" }}
          >
            {togglesVisible ? "Hide" : "Show"} Column Toggles
          </MediumTextButton>
          <SmallTextButton onClick={exportRows}>Export</SmallTextButton>
        </div>
        <div className="decks_table_toggles">
          {togglesVisible &&
            toggleableColumns.map(column => (
              <CheckboxContainer key={column.id}>
                {column.render("Header")}
                <input type="checkbox" {...column.getToggleHiddenProps({})} />
                <span className={"checkmark"} />
              </CheckboxContainer>
            ))}
        </div>
        <div className="decks_table_search_cont">
          <WrappedReactSelect
            key={tableMode}
            current={tableMode}
            options={COLLECTION_TABLE_MODES}
            callback={setTableMode}
            className={"collection_table_mode"}
          />
          <GlobalFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            countLabel={"cards"}
          />
          {globalFilter && (
            <div
              style={{ marginRight: 0, minWidth: "24px" }}
              className={"button close"}
              onClick={(e): void => {
                e.stopPropagation();
                setGlobalFilter(undefined);
              }}
              title={"clear column filter"}
            />
          )}
          {!legacyModes.includes(tableMode) && (
            <PagingControls {...pagingProps} />
          )}
        </div>
      </div>
      <TableHeaders {...headersProps} />
    </>
  );
}

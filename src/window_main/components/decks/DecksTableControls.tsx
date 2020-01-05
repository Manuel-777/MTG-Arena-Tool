/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { DECKS_TABLE_MODES } from "../../../shared/constants";

import FilterPanel from "../../FilterPanel";
import PagingControls from "../PagingControls";
import TableHeaders from "../TableHeaders";
import {
  CheckboxContainer,
  SmallTextButton,
  MediumTextButton
} from "../display";
import { GlobalFilter } from "./filters";
import { DecksTableControlsProps } from "./types";

const recentFilters = (): { id: string; value: any }[] => [
  { id: "archivedCol", value: "hideArchived" }
];
const bestFilters = (): { id: string; value: any }[] => [
  { id: "archivedCol", value: "hideArchived" },
  { id: "wins", value: [5, undefined] },
  { id: "winrate100", value: [50, undefined] }
];
const wantedFilters = (): { id: string; value: any }[] => [
  { id: "archivedCol", value: "hideArchived" },
  { id: "boosterCost", value: [1, undefined] }
];

export default function DecksTableControls({
  canNextPage,
  canPreviousPage,
  filterMatchesCallback,
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
  setAllFilters,
  setFilter,
  setGlobalFilter,
  setPageSize,
  setTableMode,
  tableMode,
  toggleHideColumn,
  toggleSortBy,
  visibleHeaders
}: DecksTableControlsProps): JSX.Element {
  const [toggleableColumns, initialFiltersVisible] = React.useMemo(() => {
    const toggleableColumns = flatColumns.filter(
      (column: any) => column.mayToggle
    );
    const initialFiltersVisible: { [key: string]: boolean } = {};
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
  const filterPanel = new FilterPanel(
    "decks_top",
    filterMatchesCallback,
    filters,
    [],
    [],
    [],
    false,
    [],
    false,
    null,
    false,
    false
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
          <span style={{ paddingBottom: "8px" }}>Filter match results:</span>
          <span style={{ width: "260px" }}>{filterPanel.render()}</span>
          <span style={{ paddingBottom: "8px" }}>Presets:</span>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(recentFilters);
              setFiltersVisible(initialFiltersVisible);
              toggleSortBy("timeTouched", true);
              for (const column of toggleableColumns) {
                const isVisible = [
                  "format",
                  "colorSortVal",
                  "timeTouched",
                  "lastEditWinrate"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Recent
          </SmallTextButton>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(bestFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                wins: true,
                winrate100: true
              });
              toggleSortBy("winrate100", true);
              for (const column of toggleableColumns) {
                const isVisible = [
                  "format",
                  "colorSortVal",
                  "losses",
                  "winrate100",
                  "wins"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Best
          </SmallTextButton>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(wantedFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                boosterCost: true
              });
              toggleSortBy("boosterCost", true);
              for (const column of toggleableColumns) {
                const isVisible = [
                  "format",
                  "colorSortVal",
                  "boosterCost",
                  "timeUpdated"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Wanted
          </SmallTextButton>
          <MediumTextButton
            onClick={(): void => setTogglesVisible(!togglesVisible)}
            style={{ margin: "0 0 5px 12px" }}
          >
            {togglesVisible ? "Hide" : "Show"} Column Toggles
          </MediumTextButton>
        </div>
        <div className="decks_table_toggles">
          {togglesVisible &&
            toggleableColumns.map((column: any) => (
              <CheckboxContainer key={column.id}>
                {column.render("Header")}
                <input type="checkbox" {...column.getToggleHiddenProps()} />
                <span className={"checkmark"} />
              </CheckboxContainer>
            ))}
        </div>
        <div className="decks_table_search_cont">
          <WrappedReactSelect
            current={tableMode}
            options={DECKS_TABLE_MODES}
            callback={setTableMode}
            className={"decks_table_mode"}
          />
          <GlobalFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            promptNoun={"decks"}
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
          <PagingControls {...pagingProps} />
        </div>
      </div>
      <TableHeaders {...headersProps} />
    </>
  );
}

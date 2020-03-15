import React from "react";
import { FilterValue } from "react-table";
import {
  COLLECTION_CHART_MODE,
  COLLECTION_SETS_MODE,
  COLLECTION_TABLE_MODES
} from "../../../shared/constants";
import db from "../../../shared/database";
import ReactSelect from "../../../shared/ReactSelect";
import { MediumTextButton, SmallTextButton } from "../misc/display";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { defaultRarity } from "./filters";
import { CollectionTableControlsProps } from "./types";

const boostersFilters = (): FilterValue[] => [
  { id: "booster", value: { true: true, false: false } }
];
const standardSetsFilter: FilterValue = {};
db.standardSetCodes.forEach(code => (standardSetsFilter[code] = true));
const standardFilters = (): FilterValue[] => [
  { id: "set", value: standardSetsFilter }
];
const ownedFilters = (): FilterValue[] => [
  { id: "owned", value: [1, undefined] }
];
const wantedFilters = (): FilterValue[] => [
  { id: "wanted", value: [1, undefined] },
  { id: "rarity", value: { ...defaultRarity, land: false } }
];

const legacyModes = [COLLECTION_CHART_MODE, COLLECTION_SETS_MODE];

export default function CollectionTableControls(
  props: CollectionTableControlsProps
): JSX.Element {
  const {
    exportCallback,
    globalFilter,
    initialFiltersVisible,
    pagingProps,
    preGlobalFilteredRows,
    rows,
    setAllFilters,
    setFiltersVisible,
    setGlobalFilter,
    setTableMode,
    setTogglesVisible,
    tableMode,
    toggleableColumns,
    toggleHideColumn,
    toggleSortBy,
    togglesVisible
  } = props;
  const exportRows = React.useCallback(() => {
    exportCallback(rows.map(row => row.values.id));
  }, [exportCallback, rows]);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        color: "var(--color-light)",
        paddingBottom: "8px"
      }}
    >
      <div className="react_table_toggles">
        <SmallTextButton onClick={exportRows}>Export</SmallTextButton>
        <span style={{ paddingBottom: "8px", marginLeft: "12px" }}>
          Presets:
        </span>
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(boostersFilters);
            setFiltersVisible({
              ...initialFiltersVisible,
              booster: true
            });
            toggleSortBy("grpId", true, false);
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
            }
            toggleHideColumn("booster", false);
            toggleHideColumn("cmc", true);
          }}
        >
          Boosters
        </SmallTextButton>
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(standardFilters);
            setFiltersVisible({
              ...initialFiltersVisible,
              set: true
            });
            toggleSortBy("grpId", true, false);
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
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
              toggleHideColumn(column.id, !column.defaultVisible);
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
              rarity: true,
              wanted: true
            });
            toggleSortBy("grpId", true, false);
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
            }
            toggleHideColumn("wanted", false);
            toggleHideColumn("cmc", true);
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
      </div>
      <ColumnToggles
        toggleableColumns={toggleableColumns}
        togglesVisible={togglesVisible}
      />
      <div className="react_table_search_cont">
        <ReactSelect
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
  );
}

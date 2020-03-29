import React from "react";
import { FilterValue } from "react-table";
import { DECKS_TABLE_MODES } from "../../../shared/constants";
import ReactSelect from "../../../shared/ReactSelect";
import { getReadableEvent } from "../../../shared/util";
import DateFilter from "../../DateFilter";
import { MediumTextButton } from "../misc/MediumTextButton";
import { SmallTextButton } from "../misc/SmallTextButton";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { DecksTableControlsProps } from "./types";

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" }
];
const bestFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" },
  { id: "wins", value: [5, undefined] },
  { id: "winrate100", value: [50, undefined] }
];
const craftColumns = new Set([
  "colorSortVal",
  "boosterCost",
  "rare",
  "mythic",
  "uncommon",
  "common"
]);

export default function DecksTableControls(
  props: DecksTableControlsProps
): JSX.Element {
  const {
    aggFilters,
    events,
    globalFilter,
    initialFiltersVisible,
    pagingProps,
    preGlobalFilteredRows,
    setAggFiltersCallback,
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
        <DateFilter
          prefixId={"decks_top"}
          current={aggFilters.date}
          callback={(date): void =>
            setAggFiltersCallback({ ...aggFilters, date })
          }
        />
        <ReactSelect
          options={events}
          current={aggFilters.eventId ?? ""}
          callback={(eventId): void =>
            setAggFiltersCallback({ ...aggFilters, eventId })
          }
          optionFormatter={getReadableEvent}
          style={{ marginBottom: "auto" }}
        />
        <span style={{ paddingBottom: "8px" }}>Presets:</span>
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(defaultFilters);
            setFiltersVisible(initialFiltersVisible);
            toggleSortBy("timeTouched", true, false);
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
            }
            toggleHideColumn("total", false);
            toggleHideColumn("lastEditWinrate", false);
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
            toggleSortBy("winrate100", true, false);
            toggleSortBy("wins", true, true);
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
            }
            toggleHideColumn("wins", false);
            toggleHideColumn("losses", false);
            toggleHideColumn("winrate100", false);
            toggleHideColumn("archivedCol", true);
          }}
        >
          Best
        </SmallTextButton>
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(defaultFilters);
            setFiltersVisible(initialFiltersVisible);
            toggleSortBy("boosterCost", true, false);
            toggleSortBy("mythic", true, true);
            toggleSortBy("rare", true, true);
            for (const column of toggleableColumns) {
              const isVisible = craftColumns.has(column.id);
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
      <ColumnToggles
        toggleableColumns={toggleableColumns}
        togglesVisible={togglesVisible}
      />
      <div className="react_table_search_cont">
        <ReactSelect
          current={tableMode}
          options={DECKS_TABLE_MODES}
          callback={setTableMode}
          className={"decks_table_mode"}
        />
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          countLabel={"decks"}
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
  );
}

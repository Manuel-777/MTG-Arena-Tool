import React from "react";
import { FilterValue } from "react-table";
import { DECKS_TABLE_MODES } from "../../../shared/constants";
import { ReactSelect, WrappedReactSelect } from "../../../shared/ReactSelect";
import { getReadableEvent } from "../../../shared/util";
import DateFilter from "../../DateFilter";
import { MediumTextButton, SmallTextButton } from "../display";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { DecksTableControlsProps } from "./types";

const recentFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" }
];
const bestFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" },
  { id: "wins", value: [5, undefined] },
  { id: "winrate100", value: [50, undefined] }
];
const wantedFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" },
  { id: "boosterCost", value: [1, undefined] }
];

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
      <div className="decks_table_toggles">
        <DateFilter
          prefixId={"decks_top"}
          current={aggFilters.date}
          callback={(date): void =>
            setAggFiltersCallback({ ...aggFilters, date })
          }
        />
        <div className={"select_container"} style={{ marginBottom: "auto" }}>
          <ReactSelect
            options={events}
            current={aggFilters.eventId ?? ""}
            callback={(eventId): void =>
              setAggFiltersCallback({ ...aggFilters, eventId })
            }
            optionFormatter={getReadableEvent}
          />
        </div>
        <span style={{ paddingBottom: "8px" }}>Presets:</span>
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(recentFilters);
            setFiltersVisible(initialFiltersVisible);
            toggleSortBy("timeTouched", true, false);
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
            toggleSortBy("winrate100", true, false);
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
            toggleSortBy("boosterCost", true, false);
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
      <ColumnToggles
        toggleableColumns={toggleableColumns}
        togglesVisible={togglesVisible}
      />
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

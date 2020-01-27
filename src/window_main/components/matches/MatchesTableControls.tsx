import React from "react";
import { FilterValue } from "react-table";
import { MATCHES_TABLE_MODES } from "../../../shared/constants";
import { ReactSelect, WrappedReactSelect } from "../../../shared/ReactSelect";
import { getReadableEvent } from "../../../shared/util";
import DateFilter from "../../DateFilter";
import { MediumTextButton, SmallTextButton } from "../display";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { MatchesTableControlsProps } from "./types";

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" }
];

export default function MatchesTableControls(
  props: MatchesTableControlsProps
): JSX.Element {
  const {
    aggFilters,
    events,
    globalFilter,
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
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(defaultFilters);
            setFiltersVisible({});
            toggleSortBy("timestamp", true, false);
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
            }
          }}
        >
          Reset
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
        <WrappedReactSelect
          key={tableMode}
          current={tableMode}
          options={MATCHES_TABLE_MODES}
          callback={setTableMode}
          className={"matches_table_mode"}
        />
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          countLabel={"matches"}
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

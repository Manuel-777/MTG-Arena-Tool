import React from "react";
import { FilterValue } from "react-table";
import { EVENTS_TABLE_MODES } from "../../../shared/constants";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { getReadableEvent } from "../../../shared/util";
import DateFilter from "../../DateFilter";
import { MediumTextButton, SmallTextButton } from "../display";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import { useBaseTableControls } from "../tables/hooks";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { EventsTableControlsProps } from "./types";

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" }
];

export default function EventsTableControls(
  props: EventsTableControlsProps
): JSX.Element {
  const {
    aggFilters,
    events,
    globalFilter,
    preGlobalFilteredRows,
    setAggFiltersCallback,
    setAllFilters,
    setGlobalFilter,
    setTableMode,
    tableMode,
    toggleSortBy
  } = props;
  const {
    headersProps,
    pagingProps,
    setFiltersVisible,
    setTogglesVisible,
    toggleableColumns,
    togglesVisible
  } = useBaseTableControls(props);
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
          <DateFilter
            prefixId={"decks_top"}
            current={aggFilters.date}
            callback={(date): void =>
              setAggFiltersCallback({ ...aggFilters, date })
            }
          />
          <WrappedReactSelect
            className={"decks_top_query_event"}
            options={events}
            current={aggFilters.eventId ?? ""}
            callback={(eventId): void =>
              setAggFiltersCallback({ ...aggFilters, eventId })
            }
            optionFormatter={getReadableEvent}
          />
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(defaultFilters);
              setFiltersVisible({});
              toggleSortBy("timestamp", true, false);
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
        <div className="decks_table_search_cont">
          <WrappedReactSelect
            key={tableMode}
            current={tableMode}
            options={EVENTS_TABLE_MODES}
            callback={setTableMode}
            className={"events_table_mode"}
          />
          <GlobalFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            countLabel={"events"}
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

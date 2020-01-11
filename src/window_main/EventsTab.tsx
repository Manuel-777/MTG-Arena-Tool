import isValid from "date-fns/isValid";
import React from "react";
import { createDiv } from "../shared/dom-fns";
import pd from "../shared/player-data";
import Aggregator from "./aggregator";
import { AggregatorFilters } from "./components/decks/types";
import EventsTable from "./components/events/EventsTable";
import {
  EventsTableState,
  EventTableData,
  SerializedEvent
} from "./components/events/types";
import mountReactComponent from "./mountReactComponent";
import {
  hideLoadingBars,
  ipcSend,
  makeResizable,
  resetMainContainer,
  toggleArchived
} from "./renderer-util";
import StatsPanel from "./stats-panel";
import { getReadableEvent } from "../shared/util";

function saveUserState(state: EventsTableState): void {
  ipcSend("save_user_settings", {
    eventsTableState: state,
    eventsTableMode: state.eventsTableMode,
    skip_refresh: true
  });
}

function updateStatsPanel(
  container: HTMLElement,
  aggregator: Aggregator
): void {
  container.innerHTML = "";
  const div = createDiv(["ranks_history"]);
  div.style.padding = "0 12px";

  const statsPanel = new StatsPanel(
    "events_top",
    aggregator,
    pd.settings.right_panel_width,
    true
  );
  const statsPanelDiv = statsPanel.render();
  statsPanelDiv.style.display = "flex";
  statsPanelDiv.style.flexDirection = "column";
  statsPanelDiv.style.marginTop = "16px";
  statsPanelDiv.style.padding = "12px";
  div.appendChild(statsPanelDiv);
  const drag = createDiv(["dragger"]);
  container.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);
  container.appendChild(div);
}

function getEventsData(aggregator: Aggregator): EventTableData[] {
  return pd.eventList
    .filter((event: SerializedEvent) => {
      // legacy filter logic
      if (event === undefined || event.CourseDeck === undefined) {
        return false;
      }
      if (!aggregator.filterDate(event.date)) return false;
      return aggregator.filterEvent(event.InternalEventName);
    })
    .map(
      (event: SerializedEvent): EventTableData => {
        const timestamp = new Date(event.date ?? NaN);
        const colors = event.CourseDeck.colors ?? [];
        const wlGate = {
          CurrentWins: 0,
          CurrentLosses: 0,
          ProcessedMatchIds: [],
          ...event.ModuleInstanceData.WinNoGate,
          ...event.ModuleInstanceData.WinLossGate
        };
        return {
          ...event,
          archivedSortVal: event.archived ? 1 : 0,
          custom: true,
          colors,
          colorSortVal: colors.join(""),
          deckId: event.CourseDeck.id ?? "",
          deckName: event.CourseDeck.name ?? "",
          eventState:
            event.custom ||
            event.CurrentEventState === "DoneWithMatches" ||
            event.CurrentEventState === 2
              ? "Completed"
              : "In Progress",
          losses: wlGate.CurrentLosses ?? 0,
          matchIds: (wlGate.ProcessedMatchIds as string[]).map(
            id => id + "-" + pd.arenaId
          ),
          name: getReadableEvent(event.InternalEventName),
          timestamp: isValid(timestamp) ? timestamp.getTime() : NaN,
          wins: wlGate.CurrentWins ?? 0
        };
      }
    );
}

function getTotalAggEvents(): string[] {
  const totalAgg = new Aggregator();
  return totalAgg.events;
}

export function EventsTab({
  aggFiltersArg
}: {
  aggFiltersArg: AggregatorFilters;
}): JSX.Element {
  const {
    eventsTableMode,
    eventsTableState,
    last_date_filter: dateFilter,
    right_panel_width: panelWidth
  } = pd.settings;
  const showArchived =
    eventsTableState?.filters?.archivedCol !== "hideArchived";
  const defaultAggFilters = {
    ...Aggregator.getDefaultFilters(),
    date: dateFilter,
    ...aggFiltersArg,
    showArchived
  };
  const [aggFilters, setAggFilters] = React.useState(
    defaultAggFilters as AggregatorFilters
  );
  const events = React.useMemo(getTotalAggEvents, []);
  const data = React.useMemo(() => {
    const aggregator = new Aggregator(aggFilters);
    return getEventsData(aggregator);
  }, [aggFilters]);

  const sidePanelWidth = panelWidth + "px";
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const filterMatchesCallback = React.useCallback(
    (matchIds?: string | string[]): void => {
      if (rightPanelRef?.current) {
        updateStatsPanel(
          rightPanelRef.current,
          new Aggregator({ ...aggFilters, matchIds })
        );
      }
    },
    [rightPanelRef, aggFilters]
  );

  return (
    <>
      <div
        className={"wrapper_column"}
        style={{
          overflowX: "auto"
        }}
      >
        <EventsTable
          data={data}
          aggFilters={aggFilters}
          events={events}
          cachedState={eventsTableState}
          cachedTableMode={eventsTableMode}
          setAggFiltersCallback={setAggFilters}
          tableStateCallback={saveUserState}
          filterMatchesCallback={filterMatchesCallback}
          archiveCallback={toggleArchived}
        />
      </div>
      <div
        ref={rightPanelRef}
        className={"wrapper_column sidebar_column_l"}
        style={{
          width: sidePanelWidth,
          flex: `0 0 ${sidePanelWidth}`
        }}
      ></div>
    </>
  );
}

export function openEventsTab(aggFilters: AggregatorFilters = {}): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  mountReactComponent(<EventsTab aggFiltersArg={aggFilters} />, mainDiv);
}

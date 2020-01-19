import isValid from "date-fns/isValid";
import _ from "lodash";
import React from "react";
import { TableState } from "react-table";
import db from "../shared/database";
import { createDiv } from "../shared/dom-fns";
import pd from "../shared/player-data";
import { getReadableEvent } from "../shared/util";
import Aggregator, { AggregatorFilters } from "./aggregator";
import EventsTable from "./components/events/EventsTable";
import {
  EventInstanceData,
  EventStats,
  EventTableData,
  SerializedEvent
} from "./components/events/types";
import { useAggregatorAndSidePanel } from "./components/tables/hooks";
import mountReactComponent from "./mountReactComponent";
import {
  hideLoadingBars,
  ipcSend,
  makeResizable,
  resetMainContainer,
  toggleArchived
} from "./renderer-util";
import StatsPanel from "./stats-panel";

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function saveTableState(eventsTableState: TableState<EventTableData>): void {
  ipcSend("save_user_settings", { eventsTableState, skipRefresh: true });
}

function saveTableMode(eventsTableMode: string): void {
  ipcSend("save_user_settings", { eventsTableMode, skipRefresh: true });
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

function getValidMatchId(rawMatchId?: string): string | undefined {
  if (pd.matchExists(rawMatchId)) {
    return rawMatchId;
  }
  const newStyleMatchId = `${rawMatchId}-${pd.arenaId}`;
  if (pd.matchExists(newStyleMatchId)) {
    return newStyleMatchId;
  }
  // We couldn't find a matching index
  // data might be corrupt
  return undefined;
}

function getEventStats(event: SerializedEvent): EventStats {
  const eventData: EventInstanceData = {
    CurrentWins: 0,
    CurrentLosses: 0,
    ProcessedMatchIds: [],
    ...event.ModuleInstanceData.WinNoGate,
    ...event.ModuleInstanceData.WinLossGate
  };
  const stats: EventStats = {
    displayName: getReadableEvent(event.InternalEventName),
    duration: 0,
    eventState: "In Progress",
    gameWins: 0,
    gameLosses: 0,
    isMissingMatchData: false,
    losses: 0,
    matchIds: [],
    wins: 0
  };
  if (
    event.custom ||
    event.CurrentEventState === "DoneWithMatches" ||
    event.CurrentEventState === 2
  ) {
    stats.eventState = "Completed";
  }
  if (eventData.ProcessedMatchIds) {
    stats.matchIds = eventData.ProcessedMatchIds.map(getValidMatchId).filter(
      id => id !== undefined
    ) as string[];
    if (eventData.ProcessedMatchIds.length !== stats.matchIds.length) {
      stats.isMissingMatchData = true;
    }
  } else {
    stats.isMissingMatchData = true;
  }
  stats.matchIds.forEach(matchId => {
    const match = pd.match(matchId);
    if (!match) {
      stats.isMissingMatchData = true;
      return;
    }
    // some of the data is wierd. Games which last years or have no data.
    if (match.duration && match.duration < 3600) {
      stats.duration += match.duration;
    }
    if (match.player.win > match.opponent.win) {
      stats.wins++;
    } else if (match.player.win < match.opponent.win) {
      stats.losses++;
    }
    stats.gameWins += match.player.win;
    stats.gameLosses += match.opponent.win;
  });
  if (stats.isMissingMatchData) {
    // If the data is corrupt fallback on wlgate data.
    stats.wins = eventData.CurrentWins || 0;
    stats.losses = eventData.CurrentLosses || 0;
    // If there's missing match data we can't count game stats.
    stats.duration = undefined;
    stats.gameWins = undefined;
    stats.gameLosses = undefined;
  }
  return stats;
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
        const stats = getEventStats(event);
        return {
          ...event,
          ...stats,
          archivedSortVal: event.archived ? 1 : 0,
          custom: true,
          colors,
          colorSortVal: colors.join(""),
          deckId: event.CourseDeck.id ?? "",
          deckName: event.CourseDeck.name ?? "",
          format: db.events_format[event.InternalEventName] ?? "unknown",
          stats,
          timestamp: isValid(timestamp) ? timestamp.getTime() : NaN
        };
      }
    );
}

function getTotalAggEvents(): string[] {
  const totalAgg = new Aggregator();
  return totalAgg.trackEvents;
}

export function EventsTab({
  aggFiltersArg
}: {
  aggFiltersArg: AggregatorFilters;
}): JSX.Element {
  const { eventsTableMode, eventsTableState } = pd.settings;
  const showArchived =
    eventsTableState?.filters?.archivedCol !== "hideArchived";
  const getDataAggFilters = (data: EventTableData[]): AggregatorFilters => {
    const matchIds = _.flatten(data.map(event => event.stats.matchIds));
    return { matchIds };
  };
  const {
    aggFilters,
    data,
    filterDataCallback,
    rightPanelRef,
    setAggFilters,
    sidePanelWidth
  } = useAggregatorAndSidePanel({
    aggFiltersArg,
    getData: getEventsData,
    getDataAggFilters,
    showArchived,
    updateSidebarCallback: updateStatsPanel
  });
  const events = React.useMemo(getTotalAggEvents, []);

  return (
    <>
      <div className={"wrapper_column"}>
        <EventsTable
          data={data}
          aggFilters={aggFilters}
          events={events}
          cachedState={eventsTableState}
          cachedTableMode={eventsTableMode}
          setAggFiltersCallback={setAggFilters}
          tableModeCallback={saveTableMode}
          tableStateCallback={saveTableState}
          filterDataCallback={filterDataCallback}
          archiveCallback={toggleArchived}
          editTagCallback={editTag}
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

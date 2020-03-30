import isValid from "date-fns/isValid";
import React from "react";
import { TableState } from "react-table";
import db from "../../shared/database";
import { getReadableEvent } from "../../shared/util";
import { EventInstanceData, InternalEvent } from "../../types/event";
import Aggregator, { AggregatorFilters } from "../aggregator";
import EventsTable from "../components/events/EventsTable";
import { EventStats, EventTableData } from "../components/events/types";
import { isHidingArchived } from "../components/tables/filters";
import { useAggregatorData } from "../components/tables/useAggregatorData";
import { ipcSend, toggleArchived } from "../rendererUtil";
import { getMatch, matchExists, eventsList } from "../../shared-store";
import { reduxAction } from "../../shared-redux/sharedRedux";
import store from "../../shared-redux/stores/rendererStore";
import { IPC_ALL, IPC_RENDERER } from "../../shared/constants";

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function saveTableState(eventsTableState: TableState<EventTableData>): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { eventsTableState },
    IPC_ALL ^ IPC_RENDERER
  );
}

function saveTableMode(eventsTableMode: string): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { eventsTableMode },
    IPC_ALL ^ IPC_RENDERER
  );
}

function getValidMatchId(rawMatchId?: string): string | undefined {
  if (matchExists(rawMatchId || "")) {
    return rawMatchId;
  }
  const playerData = store.getState().playerdata;
  const newStyleMatchId = `${rawMatchId}-${playerData.arenaId}`;
  if (matchExists(newStyleMatchId)) {
    return newStyleMatchId;
  }
  // We couldn't find a matching index
  // data might be corrupt
  return undefined;
}

function getEventStats(event: InternalEvent): EventStats {
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
    const match = getMatch(matchId);
    if (!match) {
      stats.isMissingMatchData = true;
      return;
    }
    // some of the data is wierd. Games which last years or have no data.
    if (match.duration && match.duration < 3600) {
      stats.duration = (stats.duration ?? 0) + match.duration;
    }
    if (match.player.win > match.opponent.win) {
      stats.wins++;
    } else if (match.player.win < match.opponent.win) {
      stats.losses++;
    }
    stats.gameWins = (stats.gameWins ?? 0) + match.player.win;
    stats.gameLosses = (stats.gameLosses ?? 0) + match.opponent.win;
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

function getEventsData(
  aggregator: Aggregator,
  archivedCache: Record<string, boolean>
): EventTableData[] {
  return eventsList()
    .filter((event: InternalEvent) => {
      // legacy filter logic
      if (event === undefined || event.CourseDeck === undefined) {
        return false;
      }
      if (!aggregator.filterDate(event.date)) return false;
      return aggregator.filterEvent(event.InternalEventName);
    })
    .map(
      (event: InternalEvent): EventTableData => {
        const timestamp = new Date(event.date ?? NaN);
        const colors = event.CourseDeck.colors ?? [];
        const stats = getEventStats(event);
        const archived = archivedCache[event.id] ?? event.archived ?? false;
        return {
          ...event,
          ...stats,
          archived,
          archivedSortVal: archived ? 1 : 0,
          custom: true,
          colors,
          colorSortVal: colors.join(""),
          deckId: event.CourseDeck.id,
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

export default function EventsTab({
  aggFiltersArg
}: {
  aggFiltersArg?: AggregatorFilters;
}): JSX.Element {
  const { eventsTableMode, eventsTableState } = store.getState().settings;
  const showArchived = !isHidingArchived(eventsTableState);
  const { aggFilters, data, setAggFilters } = useAggregatorData({
    aggFiltersArg,
    getData: getEventsData,
    showArchived
  });
  const events = React.useMemo(getTotalAggEvents, []);
  return (
    <div className="ux_item">
      <EventsTable
        data={data}
        aggFilters={aggFilters}
        events={events}
        cachedState={eventsTableState}
        cachedTableMode={eventsTableMode}
        setAggFiltersCallback={setAggFilters}
        tableModeCallback={saveTableMode}
        tableStateCallback={saveTableState}
        archiveCallback={toggleArchived}
        editTagCallback={editTag}
      />
    </div>
  );
}

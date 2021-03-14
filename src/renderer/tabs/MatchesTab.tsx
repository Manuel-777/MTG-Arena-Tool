import isValid from "date-fns/isValid";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { TableState } from "react-table";
import db from "../../shared/database-wrapper";
import Aggregator, { AggregatorFilters } from "../aggregator";
import MatchesTable from "../components/matches/MatchesTable";
import { MatchTableData } from "../components/matches/types";
import { isHidingArchived } from "../components/tables/filters";
import { TagCounts } from "../components/tables/types";
import { useAggregatorData } from "../components/tables/useAggregatorData";
import { toggleArchived } from "../rendererUtil";
import { ipcSend } from "../ipcSend";
import { reduxAction } from "../../shared/redux/sharedRedux";
import { matchesList, getMatch } from "../../shared/store";
import store, { AppState } from "../../shared/redux/stores/rendererStore";

import appCss from "../app/app.css";
import { constants, getEventPrettyName, InternalMatch } from "mtgatool-shared";

const { SUB_MATCH, IPC_NONE, IPC_ALL, IPC_RENDERER } = constants;

const { DEFAULT_ARCH, NO_ARCH } = Aggregator;
const tagPrompt = "Set archetype";

function addTag(matchid: string, tag: string): void {
  const match = getMatch(matchid);
  if (!match || [tagPrompt, NO_ARCH].includes(tag)) return;
  if (match.tags?.includes(tag)) return;
  ipcSend("add_matches_tag", { matchid, tag });
}

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function deleteTag(matchid: string, tag: string): void {
  const match = getMatch(matchid);
  if (!match || !match.tags?.includes(tag)) return;
  ipcSend("delete_matches_tag", { matchid, tag });
}

function saveTableState(matchesTableState: TableState<MatchTableData>): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { matchesTableState } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function saveTableMode(matchesTableMode: string): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { matchesTableMode } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function getMatchesData(
  aggregator: Aggregator,
  archivedCache: Record<string, boolean>
): MatchTableData[] {
  return matchesList()
    .filter((match: InternalMatch) => {
      // legacy filter logic
      if (match == undefined) {
        return false;
      }
      if (!match.opponent || !match.opponent.userid) {
        return false;
      }
      if (match.opponent.userid.indexOf("Familiar") !== -1) {
        return false;
      }
      return aggregator.filterMatch(match);
    })
    .map(
      (match: InternalMatch): MatchTableData => {
        const timestamp = new Date(match.date ?? NaN);
        const colors = match.playerDeck.colors ?? [];
        const oppColors = match.oppDeck.colors ?? [];
        const oppArenaId = match.opponent.name ?? "-#000000";
        const oppName = oppArenaId.slice(0, -6);
        const archived = archivedCache[match.id] ?? match.archived ?? false;
        return {
          ...match,
          archived,
          archivedSortVal: archived ? 1 : 0,
          custom: true,
          colors,
          colorSortVal: colors.join(""),
          deckId: match.playerDeck.id,
          deckName: match.playerDeck.name ?? "",
          deckFormat: match.playerDeck.format ?? "",
          eventName: getEventPrettyName(match.eventId),
          format: db.events_format[match.eventId] ?? "unknown",
          isOnPlay: match.player.seat === match.onThePlay ?? false,
          leaderboardPlace: match.player.leaderboardPlace,
          losses: match.opponent.win,
          oppArchetype: match.oppDeck.archetype ?? "unknown",
          oppColors,
          oppColorSortVal: oppColors.join(""),
          oppLeaderboardPlace: match.opponent.leaderboardPlace,
          oppArenaId,
          oppName,
          oppPercentile: match.opponent.percentile
            ? match.opponent.percentile / 100
            : undefined,
          oppRank: match.opponent.rank,
          oppTier: match.opponent.tier,
          oppUserId: match.opponent.userid,
          percentile: match.player.percentile
            ? match.player.percentile / 100
            : undefined,
          rank: match.player.rank,
          tags: match.tags ?? [],
          tier: match.player.tier,
          timestamp: isValid(timestamp) ? timestamp.getTime() : NaN,
          wins: match.player.win,
        };
      }
    );
}

function getTotalAggData(): [string[], TagCounts] {
  const totalAgg = new Aggregator();
  const allTags = [
    ...(totalAgg.archs ?? []).filter(
      (arch) => arch !== NO_ARCH && arch !== DEFAULT_ARCH
    ),
    ...Object.values(db.archetypes).map((arch) => arch.name),
  ];
  const tags = [...new Set(allTags)].map((tag) => {
    const count = totalAgg.archCounts?.[tag as string] ?? 0;
    return { tag, q: count };
  });
  return [totalAgg.events, tags];
}

export default function MatchesTab({
  aggFiltersArg,
}: {
  aggFiltersArg?: AggregatorFilters;
}): JSX.Element {
  const dispatcher = useDispatch();
  const matchesList = useSelector(
    (state: AppState) => state.matches.matchesIndex
  );
  const {
    matchesTableMode,
    matchesTableState,
    decksTableState,
  } = store.getState().settings;
  const showArchivedDecks = !isHidingArchived(decksTableState);
  const showArchivedMatches = !isHidingArchived(matchesTableState);
  const { aggFilters, data, setAggFilters } = useAggregatorData({
    aggFiltersArg,
    getData: getMatchesData,
    showArchivedDecks,
    showArchivedMatches,
    forceMemo: matchesList,
  });

  const openMatchDetails = React.useCallback(
    (match: InternalMatch): void => {
      reduxAction(
        dispatcher,
        { type: "SET_BACK_GRPID", arg: match.playerDeck.deckTileId },
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        {
          type: "SET_SUBNAV",
          arg: {
            type: SUB_MATCH,
            id: match.id,
          },
        },
        IPC_NONE
      );
    },
    [dispatcher]
  );

  const [events, tags] = React.useMemo(getTotalAggData, []);
  return (
    <div className={appCss.uxItem}>
      <MatchesTable
        data={data}
        aggFilters={aggFilters}
        events={events}
        tags={tags}
        cachedState={matchesTableState}
        cachedTableMode={matchesTableMode}
        setAggFiltersCallback={setAggFilters}
        tableModeCallback={saveTableMode}
        tableStateCallback={saveTableState}
        openMatchCallback={openMatchDetails}
        archiveCallback={toggleArchived}
        addTagCallback={addTag}
        editTagCallback={editTag}
        deleteTagCallback={deleteTag}
      />
    </div>
  );
}

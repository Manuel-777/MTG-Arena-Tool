import isValid from "date-fns/isValid";
import React from "react";
import { useDispatch } from "react-redux";
import { TableState } from "react-table";
import { SUB_MATCH } from "../../shared/constants";
import db from "../../shared/database";
import pd from "../../shared/PlayerData";
import { rendererSlice } from "../../shared/redux/reducers";
import { getReadableEvent } from "../../shared/util";
import { InternalMatch } from "../../types/match";
import Aggregator, { AggregatorFilters } from "../aggregator";
import MatchesTable from "../components/matches/MatchesTable";
import { MatchTableData } from "../components/matches/types";
import { isHidingArchived } from "../components/tables/filters";
import { TagCounts } from "../components/tables/types";
import { useAggregatorData } from "../components/tables/useAggregatorData";
import { ipcSend, toggleArchived } from "../rendererUtil";
import uxMove from "../uxMove";

const { DEFAULT_ARCH, NO_ARCH } = Aggregator;
const tagPrompt = "Set archetype";

function addTag(matchid: string, tag: string): void {
  const match = pd.match(matchid);
  if (!match || [tagPrompt, NO_ARCH].includes(tag)) return;
  if (match.tags?.includes(tag)) return;
  ipcSend("add_matches_tag", { matchid, tag });
}

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function deleteTag(matchid: string, tag: string): void {
  const match = pd.match(matchid);
  if (!match || !match.tags?.includes(tag)) return;
  ipcSend("delete_matches_tag", { matchid, tag });
}

function saveTableState(matchesTableState: TableState<MatchTableData>): void {
  ipcSend("save_user_settings", { matchesTableState, skipRefresh: true });
}

function saveTableMode(matchesTableMode: string): void {
  ipcSend("save_user_settings", { matchesTableMode, skipRefresh: true });
}

function getMatchesData(
  aggregator: Aggregator,
  archivedCache: Record<string, boolean>
): MatchTableData[] {
  return pd.matchList
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
          eventName: getReadableEvent(match.eventId),
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
          wins: match.player.win
        };
      }
    );
}

function getTotalAggData(): [string[], TagCounts] {
  const totalAgg = new Aggregator();
  const allTags = [
    ...(totalAgg.archs ?? []).filter(
      arch => arch !== NO_ARCH && arch !== DEFAULT_ARCH
    ),
    ...Object.values(db.archetypes).map(arch => arch.name)
  ];
  const tags = [...new Set(allTags)].map(tag => {
    const count = totalAgg.archCounts?.[tag as string] ?? 0;
    return { tag, q: count };
  });
  return [totalAgg.events, tags];
}

export default function MatchesTab({
  aggFiltersArg
}: {
  aggFiltersArg?: AggregatorFilters;
}): JSX.Element {
  const dispatcher = useDispatch();
  const { matchesTableMode, matchesTableState } = pd.settings;
  const showArchived = !isHidingArchived(matchesTableState);
  const { aggFilters, data, setAggFilters } = useAggregatorData({
    aggFiltersArg,
    getData: getMatchesData,
    showArchived
  });
  const openMatchDetails = React.useCallback(
    (match: InternalMatch): void => {
      uxMove(-100);
      const { setBackgroundGrpId, setSubNav } = rendererSlice.actions;
      dispatcher(setBackgroundGrpId(match.playerDeck.deckTileId));
      dispatcher(
        setSubNav({
          type: SUB_MATCH,
          id: match.id
        })
      );
    },
    [dispatcher]
  );
  const [events, tags] = React.useMemo(getTotalAggData, []);
  return (
    <div className="ux_item">
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

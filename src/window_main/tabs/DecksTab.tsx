import isValid from "date-fns/isValid";
import React from "react";
import { useDispatch } from "react-redux";
import { TableState } from "react-table";
import { SUB_DECK } from "../../shared/constants";
import Deck from "../../shared/deck";
import pd from "../../shared/PlayerData";
import { rendererSlice } from "../../shared/redux/reducers";
import {
  getBoosterCountEstimate,
  getReadableFormat,
  get_deck_missing as getDeckMissing
} from "../../shared/util";
import { InternalDeck } from "../../types/Deck";
import Aggregator, {
  AggregatorFilters,
  AggregatorStats,
  dateMaxValid
} from "../aggregator";
import DecksTable from "../components/decks/DecksTable";
import { DecksData } from "../components/decks/types";
import { isHidingArchived } from "../components/tables/filters";
import { useAggregatorData } from "../components/tables/useAggregatorData";
import { ipcSend } from "../rendererUtil";
import uxMove from "../uxMove";

function addTag(deckid: string, tag: string): void {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (getReadableFormat(deck.format) === tag) return;
  if (tag === "Add") return;
  if (deck.tags && deck.tags.includes(tag)) return;
  ipcSend("add_tag", { deckid, tag });
}

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function deleteTag(deckid: string, tag: string): void {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (!deck.tags || !deck.tags.includes(tag)) return;
  ipcSend("delete_tag", { deckid, tag });
}

function toggleDeckArchived(id: string | number): void {
  ipcSend("toggle_deck_archived", id + "");
}

function saveTableState(decksTableState: TableState<DecksData>): void {
  ipcSend("save_user_settings", { decksTableState, skipRefresh: true });
}

function saveTableMode(decksTableMode: string): void {
  ipcSend("save_user_settings", { decksTableMode, skipRefresh: true });
}

function getDecksData(
  aggregator: Aggregator,
  archivedCache: Record<string, boolean>
): DecksData[] {
  return pd.deckList.map(
    (deck: InternalDeck): DecksData => {
      const id = deck.id ?? "";
      const name = (deck.name ?? "").replace("?=?Loc/Decks/Precon/", "");
      const archived = archivedCache[deck.id] ?? deck.archived ?? false;
      const archivedSortVal = archived ? 1 : deck.custom ? 0.5 : 0;
      const colorSortVal = deck.colors?.join("") ?? "";
      // compute winrate metrics
      const deckStats: AggregatorStats =
        aggregator.deckStats[id] ?? Aggregator.getDefaultStats();
      const recentStats: AggregatorStats =
        aggregator.deckRecentStats[id] ?? Aggregator.getDefaultStats();
      const winrate100 = Math.round(deckStats.winrate * 100);
      // compute missing card metrics
      const missingWildcards = getDeckMissing(new Deck(deck));
      const boosterCost = getBoosterCountEstimate(missingWildcards);
      // compute last touch metrics
      const lastUpdated = new Date(deck.lastUpdated ?? NaN);
      const lastPlayed = aggregator.deckLastPlayed[id];
      const lastTouched = dateMaxValid(lastUpdated, lastPlayed);
      return {
        ...deck,
        archived,
        name,
        format: getReadableFormat(deck.format),
        ...deckStats,
        winrate100,
        ...missingWildcards,
        boosterCost,
        archivedSortVal,
        colorSortVal,
        timeUpdated: isValid(lastUpdated) ? lastUpdated.getTime() : NaN,
        timePlayed: isValid(lastPlayed) ? lastPlayed.getTime() : NaN,
        timeTouched: isValid(lastTouched) ? lastTouched.getTime() : NaN,
        lastEditWins: recentStats.wins,
        lastEditLosses: recentStats.losses,
        lastEditTotal: recentStats.total,
        lastEditWinrate: recentStats.winrate
      };
    }
  );
}

function getTotalAggEvents(): string[] {
  const totalAgg = new Aggregator();
  return totalAgg.events;
}

export default function DecksTab({
  aggFiltersArg
}: {
  aggFiltersArg?: AggregatorFilters;
}): JSX.Element {
  const dispatcher = useDispatch();
  const { decksTableMode, decksTableState } = pd.settings;
  const showArchived = !isHidingArchived(decksTableState);
  const { aggFilters, data, setAggFilters } = useAggregatorData({
    aggFiltersArg,
    getData: getDecksData,
    showArchived
  });
  const openDeckCallback = React.useCallback(
    (deck: InternalDeck): void => {
      uxMove(-100);
      const { setBackgroundGrpId, setSubNav } = rendererSlice.actions;
      dispatcher(setBackgroundGrpId(deck.deckTileId));
      dispatcher(
        setSubNav({
          type: SUB_DECK,
          id: deck.id
        })
      );
    },
    [dispatcher]
  );
  const events = React.useMemo(getTotalAggEvents, []);
  return (
    <div className="ux_item">
      <DecksTable
        data={data}
        aggFilters={aggFilters}
        events={events}
        cachedState={decksTableState}
        cachedTableMode={decksTableMode}
        setAggFiltersCallback={setAggFilters}
        tableModeCallback={saveTableMode}
        tableStateCallback={saveTableState}
        openDeckCallback={openDeckCallback}
        archiveCallback={toggleDeckArchived}
        addTagCallback={addTag}
        editTagCallback={editTag}
        deleteTagCallback={deleteTag}
      />
    </div>
  );
}

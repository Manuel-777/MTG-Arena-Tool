import isValid from "date-fns/isValid";
import React from "react";
import { useDispatch } from "react-redux";
import { TableState } from "react-table";
import getDeckColors from "../../shared/utils/getDeckColors";
import getReadableFormat from "../../shared/utils/getReadableFormat";

import Aggregator, {
  AggregatorFilters,
  AggregatorStats,
  dateMaxValid,
} from "../aggregator";
import DecksTable from "../components/decks/DecksTable";
import { DecksData } from "../components/decks/types";
import { isHidingArchived } from "../components/tables/filters";
import { useAggregatorData } from "../components/tables/useAggregatorData";
import {
  getBoosterCountEstimate,
  get_deck_missing as getDeckMissing,
} from "../rendererUtil";
import { ipcSend } from "../ipcSend";
import { reduxAction } from "../../shared/redux/sharedRedux";
import store from "../../shared/redux/stores/rendererStore";
import globalStore, { getDeck, decksList } from "../../shared/store";
import appCss from "../app/app.css";
import { constants, Deck, InternalDeck } from "mtgatool-shared";

const { SUB_DECK, IPC_NONE, IPC_ALL, IPC_RENDERER, IPC_BACKGROUND } = constants;

function addTag(deckid: string, tag: string): void {
  const deck = getDeck(deckid);
  if (!deck || !tag) return;
  if (getReadableFormat(deck.format) === tag) return;
  if (tag === "Add") return;
  if (deck.tags && deck.tags.includes(tag)) return;
  reduxAction(
    store.dispatch,
    { type: "ADD_DECK_TAG", arg: { tag: tag, deck: deckid } },
    IPC_BACKGROUND
  );
}

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function deleteTag(deckid: string, tag: string): void {
  const deck = getDeck(deckid);
  if (!deck || !tag) return;
  if (!deck.tags || !deck.tags.includes(tag)) return;
  reduxAction(
    store.dispatch,
    { type: "REMOVE_DECK_TAG", arg: { tag: tag, deck: deckid } },
    IPC_BACKGROUND
  );
}

function toggleDeckArchived(id: string | number): void {
  ipcSend("toggle_deck_archived", id + "");
}

function saveTableState(decksTableState: TableState<DecksData>): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { decksTableState } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function saveTableMode(decksTableMode: string): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { decksTableMode } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function getDecksData(
  aggregator: Aggregator,
  archivedCache: Record<string, boolean>
): DecksData[] {
  return decksList().map(
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
        tags: [...(store.getState().playerdata.deckTags[deck.id] || [])],
        archived,
        name,
        format: getReadableFormat(deck.format),
        ...deckStats,
        winrate100,
        ...missingWildcards,
        boosterCost,
        archivedSortVal,
        colorSortVal,
        custom:
          globalStore.staticDecks.indexOf(deck.id) == -1 ? true : deck.custom,
        timeUpdated: isValid(lastUpdated) ? lastUpdated.getTime() : NaN,
        timePlayed: isValid(lastPlayed) ? lastPlayed.getTime() : NaN,
        timeTouched: isValid(lastTouched) ? lastTouched.getTime() : NaN,
        lastEditWins: recentStats.wins,
        lastEditLosses: recentStats.losses,
        lastEditTotal: recentStats.total,
        lastEditWinrate: recentStats.winrate,
        colors: deck.colors || getDeckColors(deck),
      };
    }
  );
}

function getTotalAggEvents(): string[] {
  const totalAgg = new Aggregator();
  return totalAgg.events;
}

export default function DecksTab({
  aggFiltersArg,
}: {
  aggFiltersArg?: AggregatorFilters;
}): JSX.Element {
  const dispatcher = useDispatch();
  const {
    decksTableMode,
    matchesTableState,
    decksTableState,
  } = store.getState().settings;
  const showArchivedDecks = !isHidingArchived(decksTableState);
  const showArchivedMatches = !isHidingArchived(matchesTableState);
  const { aggFilters, data, setAggFilters } = useAggregatorData({
    aggFiltersArg,
    getData: getDecksData,
    showArchivedDecks,
    showArchivedMatches,
  });
  const openDeckCallback = React.useCallback(
    (deck: InternalDeck): void => {
      reduxAction(
        dispatcher,
        { type: "SET_BACK_GRPID", arg: deck.deckTileId },
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        {
          type: "SET_SUBNAV",
          arg: {
            type: SUB_DECK,
            id: deck.id,
          },
        },
        IPC_NONE
      );
    },
    [dispatcher]
  );
  const events = React.useMemo(getTotalAggEvents, []);
  return (
    <div className={appCss.uxItem}>
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

import isValid from "date-fns/isValid";
import React from "react";
import { useDispatch } from "react-redux";
import { TableState } from "react-table";
import {
  SUB_DECK,
  IPC_NONE,
  IPC_ALL,
  IPC_RENDERER,
  IPC_BACKGROUND
} from "../../shared/constants";
import Deck from "../../shared/deck";
import { getReadableFormat } from "../../shared/util";
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
import {
  ipcSend,
  getBoosterCountEstimate,
  get_deck_missing as getDeckMissing
} from "../rendererUtil";
import uxMove from "../uxMove";
import { reduxAction } from "../../shared-redux/sharedRedux";
import store from "../../shared-redux/stores/rendererStore";
import { getDeck, decksList } from "../../shared-store";

function addTag(deckid: string, tag: string): void {
  const deck = getDeck(deckid);
  if (!deck || !tag) return;
  if (getReadableFormat(deck.format) === tag) return;
  if (tag === "Add") return;
  if (deck.tags && deck.tags.includes(tag)) return;
  reduxAction(
    store.dispatch,
    "ADD_DECK_TAG",
    { tag: tag, deck: deckid },
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
    "REMOVE_DECK_TAG",
    { tag: tag, deck: deckid },
    IPC_BACKGROUND
  );
}

function toggleDeckArchived(id: string | number): void {
  ipcSend("toggle_deck_archived", id + "");
}

function saveTableState(decksTableState: TableState<DecksData>): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { decksTableState },
    IPC_ALL ^ IPC_RENDERER
  );
}

function saveTableMode(decksTableMode: string): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { decksTableMode },
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
        tags: [
          ...(store.getState().playerdata.deckTags[deck.id] || []),
          ...deck.tags
        ],
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
  const { decksTableMode, decksTableState } = store.getState().settings;
  const showArchived = !isHidingArchived(decksTableState);
  const { aggFilters, data, setAggFilters } = useAggregatorData({
    aggFiltersArg,
    getData: getDecksData,
    showArchived
  });
  const openDeckCallback = React.useCallback(
    (deck: InternalDeck): void => {
      uxMove(-100);
      reduxAction(dispatcher, "SET_BACK_GRPID", deck.deckTileId, IPC_NONE);
      reduxAction(
        dispatcher,
        "SET_SUBNAV",
        {
          type: SUB_DECK,
          id: deck.id
        },
        IPC_NONE
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

import {
  IPC_BACKGROUND,
  IPC_OVERLAY,
  IPC_RENDERER,
  IPC_ALL
} from "../shared/constants";
import { ipcSend, setData } from "./backgroundUtil";
import globals from "./globals";

import { playerDb, playerDbLegacy } from "../shared/db/LocalDatabase";
import { isV2CardsList, ArenaV3Deck, DeckChange } from "../types/Deck";
import arenaLogWatcher from "./arena-log-watcher";
import convertDeckFromV3 from "./convertDeckFromV3";
import { reduxAction } from "../shared-redux/sharedRedux";
import { InternalMatch } from "../types/match";
import store from "../shared-redux/stores/backgroundStore";
import { InternalEvent } from "../types/event";
import { InternalEconomyTransaction } from "../types/inventory";

const ipcLog = (message: string): void => ipcSend("ipc_log", message);
const ipcPop = (args: {
  text: string;
  time: number;
  progress?: number;
}): void => ipcSend("popup", args);

// Merges settings and updates singletons across processes
// (essentially fancy setData for settings field only)
export function syncSettings(
  dirtySettings = {},
  refresh = globals.debugLog || !globals.firstPass
): void {
  const settings = { ...store.getState().settings, ...dirtySettings };
  if (refresh) {
    reduxAction(
      globals.store.dispatch,
      "SET_SETTINGS",
      settings,
      IPC_ALL ^ IPC_BACKGROUND
    );
  }
}

function fixBadPlayerData(savedData: any): any {
  // 2020-01-17 discovered with @Thaoden that some old draft decks might be v3
  // probably caused by a bad label handler that was temporarily on stable
  // 2020-01-27 @Manwe discovered that some old decks are saved as Deck objects
  // TODO permanently convert them similar to approach used above
  const decks = { ...savedData.decks };
  Object.keys(decks).map((k: string) => {
    const deck = decks[k];
    if (!isV2CardsList(deck.mainDeck)) {
      ipcLog("Converting v3 deck: " + deck.id);
      const fixedDeck = convertDeckFromV3((deck as unknown) as ArenaV3Deck);
      // 2020-02-29 discovered by user Soil'n'Rock that empty decks were considered
      // as "Deck" by the isV2CardsList() function, thus de-archiving them.
      decks[deck.id] = { ...fixedDeck, archived: deck.archived };
    }
  });
  savedData.decks = decks;
  return savedData;
}

// Loads this player's configuration file
export async function loadPlayerConfig(): Promise<void> {
  const { playerId, playerName } = globals.store.getState().playerdata;
  ipcLog("Load player ID: " + playerId);
  ipcPop({ text: "Loading player history...", time: 0, progress: 2 });
  playerDb.init(playerId, playerName);
  playerDbLegacy.init(playerId, playerName);

  reduxAction(
    globals.store.dispatch,
    "SET_PLAYERDB",
    playerDb.filePath,
    IPC_RENDERER
  );
  ipcLog("Player database: " + playerDb.filePath);

  ipcLog("Finding all documents in player database...");
  let savedData = await playerDb.findAll();
  savedData = fixBadPlayerData(savedData);
  const { settings } = savedData;

  // Get Rank data
  reduxAction(globals.store.dispatch, "SET_RANK", savedData.rank, IPC_RENDERER);

  // Get Matches data
  const matchesList: InternalMatch[] = savedData.matches_index
    .filter((id: string) => savedData[id])
    .map((id: string) => {
      savedData[id].date = new Date(savedData[id].date).toString();
      return savedData[id];
    });

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_MATCHES",
    matchesList,
    IPC_RENDERER
  );

  // Get Events data
  const eventsList: InternalEvent[] = savedData.courses_index
    .filter((id: string) => savedData[id])
    .map((id: string) => {
      savedData[id].date = new Date(savedData[id].date).getTime();
      return savedData[id];
    });

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_EVENTS",
    eventsList,
    IPC_RENDERER
  );

  // Get Decks data
  const decks = { ...savedData.decks };
  const decksList = Object.keys(decks).map((k: string) => decks[k]);

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_DECKS",
    decksList,
    IPC_RENDERER
  );

  // Get Deck Changes data
  const changesList: DeckChange[] = savedData.deck_changes_index
    .filter((id: string) => savedData[id])
    .map((id: string) => savedData[id]);

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_DECK_CHANGES",
    changesList,
    IPC_RENDERER
  );

  // Get Economy data
  const economyList: InternalEconomyTransaction[] = savedData.economy_index
    .filter((id: string) => savedData[id])
    .map((id: string) => {
      savedData[id].date = new Date(savedData[id].date).toString();
      return savedData[id];
    });

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_ECONOMY",
    economyList,
    IPC_RENDERER
  );

  // Get Drafts data
  const draftsList: InternalEconomyTransaction[] = savedData.draft_index
    .filter((id: string) => savedData[id])
    .map((id: string) => savedData[id]);

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_DRAFT",
    draftsList,
    IPC_RENDERER
  );

  // Get Seasonal data
  const newSeasonal = { ...savedData.seasonal };
  Object.keys(newSeasonal).forEach((id: string) => {
    const update = newSeasonal[id] as any;
    // Ugh.. some timestamps are stored as Date
    if (update.timestamp instanceof Date) {
      update.timestamp = update.timestamp.getTime();
      newSeasonal[id] = update;
    }
  });

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_SEASONAL",
    newSeasonal,
    IPC_RENDERER
  );

  // Get cards data
  reduxAction(
    globals.store.dispatch,
    "ADD_CARDS_FROM_STORE",
    savedData.cards,
    IPC_RENDERER
  );

  // Get tags colors data
  reduxAction(
    globals.store.dispatch,
    "SET_TAG_COLORS",
    savedData.tags_colors,
    IPC_RENDERER
  );

  // Get deck tags data
  reduxAction(
    globals.store.dispatch,
    "SET_DECK_TAGS",
    savedData.deck_tags,
    IPC_RENDERER
  );

  // Other
  setData(savedData, true);
  ipcSend("renderer_set_bounds", savedData.windowBounds);
  syncSettings(settings, true);

  // populate draft overlays with last draft if possible
  if (draftsList.length) {
    const lastDraft = draftsList[draftsList.length - 1];
    ipcSend("set_draft_cards", lastDraft, IPC_OVERLAY);
  }

  ipcLog("...found all documents in player database.");
  ipcPop({ text: "Player history loaded.", time: 3000, progress: -1 });

  // Only if watcher is not initialized
  // Could happen when using multi accounts
  if (globals.watchingLog == false) {
    globals.watchingLog = true;
    const logUri = globals.store.getState().appsettings.logUri;
    ipcLog("Starting Arena Log Watcher: " + logUri);
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(logUri);
    ipcLog("Calling back to http-api...");
  }
}

import { shell } from "electron";
import _ from "lodash";
import {
  IPC_BACKGROUND,
  IPC_OVERLAY,
  IPC_RENDERER,
  IPC_ALL
} from "../shared/constants";
import { ipcSend, setData } from "./backgroundUtil";
import globals from "./globals";

import { playerDb, playerDbLegacy } from "../shared/db/LocalDatabase";
import playerData from "../shared/PlayerData";
import { isV2CardsList, ArenaV3Deck } from "../types/Deck";
import arenaLogWatcher from "./arena-log-watcher";
import convertDeckFromV3 from "./convertDeckFromV3";
import { reduxAction } from "../shared-redux/sharedRedux";
import { InternalMatch } from "../types/match";
import store from "../shared-redux/stores/backgroundStore";

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

async function fixBadPlayerData(): Promise<void> {
  // 2020-01-17 discovered with @Thaoden that some old draft decks might be v3
  // probably caused by a bad label handler that was temporarily on stable
  const decks = { ...playerData.decks };
  for (const deck of playerData.deckList) {
    if (!isV2CardsList(deck.mainDeck)) {
      ipcLog("Converting v3 deck: " + deck.id);
      const fixedDeck = convertDeckFromV3((deck as unknown) as ArenaV3Deck);
      decks[deck.id] = { ...fixedDeck, archived: deck.archived };
      await playerDb.upsert("decks", deck.id, fixedDeck);
    }
  }

  // 2020-01-27 @Manwe discovered that some old decks are saved as Deck objects
  // TODO permanently convert them similar to approach used above

  setData({ decks }, false);
}

// Loads this player's configuration file
export async function loadPlayerConfig(playerId: string): Promise<void> {
  ipcLog("Load player ID: " + playerId);
  ipcPop({ text: "Loading player history...", time: 0, progress: 2 });
  playerDb.init(playerId, playerData.name);
  playerDbLegacy.init(playerId, playerData.name);
  setData({ playerDbPath: playerDb.filePath }, false);
  ipcLog("Player database: " + playerDb.filePath);

  ipcLog("Finding all documents in player database...");
  const savedData = await playerDb.findAll();

  const __playerData = _.defaultsDeep(savedData, playerData);
  const { settings } = __playerData;

  // Store Matches data redux/store
  const matchesList: InternalMatch[] = __playerData.matches_index
    .filter((id: string) => __playerData[id])
    .map((id: string) => {
      __playerData[id].date = new Date(__playerData[id].date).toString();
      return __playerData[id];
    });

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_MATCHES",
    matchesList,
    IPC_RENDERER
  );

  setData(__playerData, true);
  await fixBadPlayerData();
  ipcSend("renderer_set_bounds", __playerData.windowBounds);
  syncSettings(settings, true);

  // populate draft overlays with last draft if possible
  if (playerData.draftList.length) {
    const lastDraft = playerData.draftList[playerData.draftList.length - 1];
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

export function backportNeDbToElectronStore(): void {
  ipcLog("Backporting player database...");
  playerDbLegacy.upsertAll(playerData.data).then(num => {
    ipcLog(`...backported ${num} records from nedb to electron-store`);
    ipcPop({
      text: "Successfully backported all player data to JSON.",
      time: 3000,
      progress: -1
    });
    shell.showItemInFolder(playerDbLegacy.filePath);
  });
}

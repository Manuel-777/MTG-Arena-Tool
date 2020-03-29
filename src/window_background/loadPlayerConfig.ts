import { shell } from "electron";
import _ from "lodash";
import {
  IPC_BACKGROUND,
  IPC_OVERLAY,
  IPC_RENDERER,
  IPC_MAIN
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
import globalStore from "../shared-store";

const ipcLog = (message: string): void => ipcSend("ipc_log", message);
const ipcPop = (args: any): void => ipcSend("popup", args);

// Merges settings and updates singletons across processes
// (essentially fancy setData for settings field only)
// To persist changes, see "save_user_settings" or "save_app_settings"
export function syncSettings(
  dirtySettings = {},
  refresh = globals.debugLog || !globals.firstPass
): void {
  const settings = { ...playerData.settings, ...dirtySettings };
  if (refresh) {
    reduxAction(
      globals.store.dispatch,
      "SET_SETTINGS",
      settings,
      IPC_OVERLAY | IPC_RENDERER | IPC_MAIN
    );
  }
  setData({ settings });
}

function ipcUpgradeProgress(progress: number): void {
  const percent = Math.round(100 * progress);
  const text = `Upgrading player database... ${percent}% (happens once, could take minutes)`;
  ipcPop({ text, time: 0, progress });
}

async function migrateIfNecessary(): Promise<void> {
  ipcLog("Checking if database requires upgrade...");
  try {
    const legacyData = await playerDbLegacy.find("", "cards");
    if (!legacyData) {
      ipcLog("...no legacy JSON data, skipping migration.");
      return;
    }
    ipcLog(`...found legacy JSON data, cards_time:${legacyData.cards_time}`);
    const data = await playerDb.find("", "cards");
    if (data) {
      ipcLog(`...found NeDb data, cards_time:${data.cards_time}`);
      ipcLog("...skipping migration.");
      return;
    }
    ipcLog("Upgrading player database...");
    ipcSend("save_app_settings", {}, IPC_BACKGROUND); // ensure app db migrates
    const savedData = await playerDbLegacy.findAll();
    const __playerData = _.defaultsDeep(savedData, playerData);
    const { settings } = __playerData;
    // ensure blended user settings migrate
    setData(__playerData, false);
    syncSettings(settings, false);
    ipcSend("save_user_settings", { skipRefresh: true }, IPC_BACKGROUND);
    const dataToMigrate = playerData.data;
    const totalDocs = Object.values(dataToMigrate).length;
    ipcUpgradeProgress(0);
    const num = await playerDb.upsertAll(dataToMigrate, (err, num) => {
      if (err) {
        console.error(err);
      } else if (num) {
        ipcUpgradeProgress(num / totalDocs);
      }
    });
    ipcLog(`...migrated ${num} records from electron-store to nedb`);
  } catch (err) {
    console.error(err);
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
      decks[deck.id] = fixedDeck;
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

  await migrateIfNecessary();

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
    ipcLog("Starting Arena Log Watcher: " + settings.logUri);
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(settings.logUri);
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

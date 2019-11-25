import _ from "lodash";
import { shell } from "electron";

import { IPC_BACKGROUND } from "../shared/constants";

import { ipc_send as ipcSend, setData } from "./background-util";
import globals from "./globals";
import { playerDb, playerDbLegacy } from "../shared/db/LocalDatabase";
import playerData from "../shared/player-data";
import arenaLogWatcher from "./arena-log-watcher";

const ipcLog = message => ipcSend("ipc_log", message);
const ipcPop = args => ipcSend("popup", args);

// Merges settings and updates singletons across processes
// (essentially fancy setData for settings field only)
// To persist changes, see "save_user_settings" or "save_app_settings"
export function syncSettings(
  dirtySettings = {},
  refresh = globals.debugLog || !globals.firstPass
) {
  const settings = { ...playerData.settings, ...dirtySettings };
  setData({ settings }, refresh);
  if (refresh) ipcSend("set_settings", JSON.stringify(settings));
}

// Loads this player's configuration file
export async function loadPlayerConfig(playerId) {
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
  setData(__playerData, true);
  ipcSend("renderer_set_bounds", __playerData.windowBounds);
  syncSettings(settings, true);
  ipcLog("...found all documents in player database.");
  ipcPop({ text: "Player history loaded.", time: 3000, progress: -1 });

  globals.watchingLog = true;
  ipcLog("Starting Arena Log Watcher: " + settings.logUri);
  globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(settings.logUri);
  ipcLog("Calling back to http-api...");
}

function ipcUpgradeProgress(progress) {
  const percent = Math.round(100 * progress);
  const text = `Upgrading player database... ${percent}% (happens once, could take minutes)`;
  ipcPop({ text, time: 0, progress });
}

async function migrateIfNecessary() {
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
    ipcSend("save_user_settings", { skip_refresh: true }, IPC_BACKGROUND);
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

export function backportNeDbToElectronStore() {
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

import _ from "lodash";
import { shell } from "electron";

import { IPC_BACKGROUND } from "../shared/constants";

import { ipc_send as ipcSend, setData } from "./background-util";
import globals from "./globals";
import { appDb, playerDb, playerDbLegacy } from "../shared/LocalDatabase";
import playerData from "../shared/player-data";
import arenaLogWatcher from "./arena-log-watcher";

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
export function loadPlayerConfig(playerId, callback) {
  ipcSend("ipc_log", "Load player ID: " + playerId);
  ipcSend("popup", {
    text: "Loading player history...",
    time: 0,
    progress: 2
  });
  playerDb.init(playerId, playerData.name);
  playerDbLegacy.init(playerId, playerData.name);
  setData({ playerDbPath: playerDb.filePath }, false);
  ipcSend("ipc_log", "Player database: " + playerDb.filePath);
  migrationDispatcher(callback);
}

function finishLoadingConfig(callback) {
  ipcSend("ipc_log", "Finding all documents in player database...");
  playerDb.findAll((err, savedData) => {
    if (err) {
      console.log(err);
      savedData = {};
    }
    const __playerData = _.defaultsDeep(savedData, playerData);
    const { settings } = __playerData;

    setData(__playerData, true);
    ipcSend("renderer_set_bounds", __playerData.windowBounds);
    syncSettings(settings, true);
    ipcSend("ipc_log", "...found all documents in player database.");
    ipcSend("popup", {
      text: "Player history loaded.",
      time: 3000,
      progress: -1
    });
    if (callback) {
      ipcSend("ipc_log", "Calling back to http-api...");
      callback();
    }
    globals.watchingLog = true;
    ipcSend("ipc_log", "Starting Arena Log Watcher: " + settings.logUri);
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(settings.logUri);
  });
}

function migrateElectronStoreToNeDb(callback) {
  ipcSend("ipc_log", "Upgrading player database...");
  ipcSend("save_app_settings", {}, IPC_BACKGROUND); // ensure app db migrates
  playerDbLegacy.findAll((err, savedData) => {
    if (savedData) {
      ipcSend("ipc_log", "Migrating player data...");
      const __playerData = _.defaultsDeep(savedData, playerData);
      const { settings } = __playerData;
      // ensure blended user settings migrate
      setData(__playerData, false);
      syncSettings(settings, false);
      ipcSend("save_user_settings", { skip_refresh: true }, IPC_BACKGROUND);
      const dataToMigrate = playerData.data;
      const totalDocs = Object.values(dataToMigrate).length;
      ipcSend("popup", {
        text: "Migrating player data: 0% (happens once, could take minutes)",
        time: 0,
        progress: 0
      });
      playerDb.upsertAll(
        dataToMigrate,
        (err, num) => {
          if (num) {
            ipcSend(
              "ipc_log",
              `...migrated ${num} records from electron-store to nedb`
            );
            finishLoadingConfig(callback);
          } else {
            if (err) {
              console.log(err);
            }
            finishLoadingConfig(callback);
          }
        },
        (err, num) => {
          if (num) {
            const completion = num / totalDocs;
            ipcSend("popup", {
              text: `Migrating player data: ${Math.round(
                100 * completion
              )}% (happens once, could take minutes)`,
              time: 0,
              progress: completion
            });
          } else if (err) {
            console.log(err);
          }
        }
      );
    } else {
      if (err) {
        console.log(err);
      }
      finishLoadingConfig(callback);
    }
  });
}

function migrationDispatcher(callback) {
  ipcSend("ipc_log", "Checking if database requires upgrade...");
  playerDbLegacy.find("", "cards", (err, legacyData) => {
    if (legacyData) {
      ipcSend(
        "ipc_log",
        `...found legacy JSON database, last cards_time:${
          legacyData.cards_time
        }`
      );
      playerDb.find("", "cards", (err, data) => {
        if (data) {
          ipcSend(
            "ipc_log",
            `...found NeDb database, last cards_time:${data.cards_time}`
          );
          finishLoadingConfig(callback);
        } else {
          if (err) {
            console.log(err);
          }
          migrateElectronStoreToNeDb(callback);
        }
      });
    } else {
      if (err) {
        console.log(err);
      }
      finishLoadingConfig(callback);
    }
  });
}

export function backportNeDbToElectronStore() {
  ipcSend("ipc_log", "Backporting player database...");
  playerDbLegacy.upsertAll(playerData.data, (err, num) => {
    ipcSend(
      "ipc_log",
      `...backported ${num} records from nedb to electron-store`
    );
    ipcSend("popup", {
      text: "Successfully backported all player data to JSON.",
      time: 3000,
      progress: -1
    });
    shell.showItemInFolder(playerDbLegacy.filePath);
  });
}

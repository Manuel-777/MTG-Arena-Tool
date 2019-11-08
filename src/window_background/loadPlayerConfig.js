import _ from "lodash";

import { IPC_BACKGROUND } from "../shared/constants";

import { ipc_send, setData } from "./background-util";
import globals from "./globals";
import { playerDb, playerDbLegacy } from "../shared/local-database";
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
  if (refresh) ipc_send("set_settings", JSON.stringify(settings));
}

// Loads this player's configuration file
export function loadPlayerConfig(playerId) {
  ipc_send("ipc_log", "Load player ID: " + playerId);
  ipc_send("popup", {
    text: "Loading player history...",
    time: 0,
    progress: 2
  });
  playerDb.init(playerId, playerData.name);
  playerDbLegacy.init(playerId, playerData.name);
  migrationDispatcher();
}

function finishLoadingConfig() {
  playerDb.findAll((err, savedData) => {
    const __playerData = _.defaultsDeep(savedData, playerData);
    const { settings } = __playerData;

    setData(__playerData, true);
    ipc_send("renderer_set_bounds", __playerData.windowBounds);
    syncSettings(settings, true);

    ipc_send("popup", {
      text: "Player history loaded.",
      time: 3000,
      progress: -1
    });

    globals.watchingLog = true;
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(settings.logUri);
  });
}

function migrateElectronStoreToNeDb() {
  ipc_send("save_app_settings", {}, IPC_BACKGROUND); // ensure app db migrates
  playerDbLegacy.findAll((err, savedData) => {
    const __playerData = _.defaultsDeep(savedData, playerData);
    setData(__playerData, false);
    // ensure blended user settings migrate
    ipc_send("save_user_settings", { refresh: false }, IPC_BACKGROUND);
    playerDb.upsertAll(playerData.data, (err, num) => {
      console.log(`Migrated ${num} records from electron-store to nedb`);
      finishLoadingConfig();
    });
  });
}

function migrationDispatcher() {
  playerDbLegacy.find("", "cards", (legacyErr, legacyData) => {
    console.log(legacyErr, legacyData && legacyData.cards_time);
    playerDb.find("", "cards", (err, data) => {
      console.log(err, data && data.cards_time);
      if (!data || (legacyData && legacyData.cards_time > data.cards_time)) {
        // legacy database has more recent data, so do migration
        ipc_send("popup", {
          text: "Upgrading local database...",
          time: 0,
          progress: 2
        });
        migrateElectronStoreToNeDb();
      }
      // no migration necessary, move along
      finishLoadingConfig();
    });
  });
}

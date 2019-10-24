import _ from "lodash";
import { ipc_send, setData } from "./background-util";
import globals from "./globals";
import { playerDb } from "../shared/local-database";
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

  playerDb.findAll((err, savedData) => {
    const __playerData = _.defaultsDeep(savedData, playerData);
    const { settings } = __playerData;

    syncSettings(settings, true);
    setData(__playerData, false);
    ipc_send("renderer_set_bounds", __playerData.windowBounds);

    ipc_send("popup", {
      text: "Player history loaded.",
      time: 3000,
      progress: -1
    });

    globals.watchingLog = true;
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(settings.logUri);
  });
}

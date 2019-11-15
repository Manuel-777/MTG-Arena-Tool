import { ipc_send, setData } from "./background-util";
import globals from "./globals";
import playerData from "../shared/player-data";
import Store from "electron-store";
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
  globals.store = new Store({
    name: playerId,
    defaults: playerData.defaultCfg
  });
  setData({ playerDbPath: globals.store.path }, false);

  const savedData = globals.store.get();
  const savedOverlays = savedData.settings.overlays || [];
  const appSettings = globals.rStore.get("settings");
  const settings = {
    ...playerData.settings,
    ...savedData.settings,
    ...appSettings,
    overlays: playerData.settings.overlays.map((overlay, index) => {
      if (index < savedOverlays.length) {
        // blend in new default overlay settings
        return { ...overlay, ...savedOverlays[index] };
      } else {
        return overlay;
      }
    })
  };
  const __playerData = {
    ...playerData,
    ...savedData,
    settings
  };
  syncSettings(__playerData.settings, true);
  setData(__playerData, false);
  ipc_send("renderer_set_bounds", playerData.windowBounds);

  ipc_send("popup", {
    text: "Player history loaded.",
    time: 3000,
    progress: -1
  });

  ipc_send("popup", {
    text: "Loading settings...",
    time: 0,
    progress: 2
  });

  globals.watchingLog = true;
  globals.stopWatchingLog = arenaLogWatcher.startWatchingLog();
  ipc_send("popup", {
    text: "Settings loaded.",
    time: 3000,
    progress: -1
  });

  return __playerData;
}

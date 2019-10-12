const { ipc_send, setData } = require("./background-util");
const httpApi = require("./http-api");

// Merges settings and updates singletons across processes
// (essentially fancy setData for settings field only)
// To persist changes, see "save_user_settings" or "save_app_settings"
function syncSettings(
  dirtySettings = {},
  refresh = globals.debugLog || !globals.firstPass
) {
  const settings = { ...playerData.settings, ...dirtySettings };
  setData({ settings }, refresh);
  if (refresh) ipc_send("set_settings", JSON.stringify(settings));
}

// Loads this player's configuration file
function loadPlayerConfig(playerId, serverData = undefined) {
  ipc_send("ipc_log", "Load player ID: " + playerId);
  ipc_send("popup", {
    text: "Loading player history...",
    time: 0,
    progress: 2
  });
  store = new Store({
    name: playerId,
    defaults: playerData.defaultCfg
  });

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

  if (serverData) {
    const requestSync = {};
    requestSync.courses = serverData.courses.filter(
      id => !(id in __playerData)
    );
    requestSync.matches = serverData.matches.filter(
      id => !(id in __playerData)
    );
    requestSync.drafts = serverData.drafts.filter(id => !(id in __playerData));
    requestSync.economy = serverData.economy.filter(
      id => !(id in __playerData)
    );

    const itemCount =
      requestSync.courses.length +
      requestSync.matches.length +
      requestSync.drafts.length +
      requestSync.economy.length;

    if (itemCount) {
      ipc_send("ipc_log", "Fetch remote player items: " + itemCount);
      httpApi.httpSyncRequest(requestSync);
      // console.log("requestSync", requestSync);
    } else {
      ipc_send("ipc_log", "No need to fetch remote player items.");
    }
  }

  ipc_send("popup", {
    text: "Loading settings...",
    time: 0,
    progress: 2
  });

  watchingLog = true;
  stopWatchingLog = startWatchingLog();
  ipc_send("popup", {
    text: "Settings loaded.",
    time: 3000,
    progress: -1
  });
}

module.exports = {
  loadPlayerConfig,
  syncSettings
};

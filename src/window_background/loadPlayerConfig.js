const {
  onLabelOutLogInfo,
  onLabelGreToClient,
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelInEventGetPlayerCourse,
  onLabelInEventGetPlayerCourseV2,
  onLabelInEventJoin,
  onLabelInEventGetCombinedRankInfo,
  onLabelInDeckGetDeckLists,
  onLabelInDeckGetDeckListsV3,
  onLabelInDeckGetPreconDecks,
  onLabelInEventGetPlayerCourses,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInDeckUpdateDeck,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInProgressionGetPlayerProgress,
  onLabelInEventDeckSubmit,
  onLabelInEventDeckSubmitV3,
  onLabelInEventGetActiveEvents,
  onLabelEventMatchCreated,
  onLabelOutDirectGameChallenge,
  onLabelOutEventAIPractice,
  onLabelInDraftDraftStatus,
  onLabelInDraftMakePick,
  onLabelOutDraftMakePick,
  onLabelInEventCompleteDraft,
  onLabelMatchGameRoomStateChangedEvent,
  onLabelInEventGetSeasonAndRankDetail,
  onLabelGetPlayerInventoryGetRewardSchedule,
  onLabelRankUpdated,
  onLabelMythicRatingUpdated,
  onLabelTrackProgressUpdated,
  onLabelTrackRewardTierUpdated
} = require("./labels");

const { ARENA_MODE_MATCH, ARENA_MODE_DRAFT } = require("../shared/constants");

const update_deck = require("./updateDeck");

var debugLogSpeed = 0.001;

const { ipc_send, setData, getDateFormat } = require("./background-util");
const httpApi = require("./http-api");
const globals = require("./globals");
const playerData = require("../shared/player-data");
const Store = require("electron-store");
const ArenaLogWatcher = require("./arena-log-watcher");

let logReadEnd = null;

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
  globals.store = new Store({
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

  globals.watchingLog = true;
  globals.stopWatchingLog = startWatchingLog();
  ipc_send("popup", {
    text: "Settings loaded.",
    time: 3000,
    progress: -1
  });
}

function startWatchingLog() {
  globals.logReadStart = new Date();
  return ArenaLogWatcher.start({
    path: globals.logUri,
    chunkSize: 268435440,
    onLogEntry: onLogEntryFound,
    onError: err => console.error(err),
    onFinish: finishLoading
  });
}

function onLogEntryFound(entry) {
  if (globals.debugLog) {
    let currentTime = new Date().getTime();
    while (currentTime + debugLogSpeed >= new Date().getTime()) {
      // sleep
    }
  }
  let json;
  if (entry.type == "connection") {
    const data = {
      arenaId: entry.socket.PlayerId,
      arenaVersion: entry.socket.ClientVersion,
      name: entry.socket.PlayerScreenName
    };
    setData(data);
  } else if (entry.playerId && entry.playerId !== playerData.arenaId) {
    return;
  } else {
    //console.log("Entry:", entry.label, entry, entry.json());
    if (globals.firstPass) {
      updateLoading(entry);
    }
    if (
      (globals.firstPass && !playerData.settings.skip_firstpass) ||
      !globals.firstPass
    ) {
      try {
        switch (entry.label) {
          case "Log.BI":
          case "Log.Info":
            if (entry.arrow == "==>") {
              json = entry.json();
              onLabelOutLogInfo(entry, json);
            }
            break;

          case "GreToClientEvent":
            json = entry.json();
            onLabelGreToClient(entry, json);
            break;

          case "ClientToMatchServiceMessageType_ClientToGREMessage":
            json = entry.json();
            onLabelClientToMatchServiceMessageTypeClientToGREMessage(
              entry,
              json
            );
            break;

          case "Event.GetPlayerCourse":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCourse(entry, json);
            }
            break;

          case "Event.GetPlayerCourseV2":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCourseV2(entry, json);
            }
            break;

          case "Event.Join":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventJoin(entry, json);
            }
            break;

          case "Event.GetCombinedRankInfo":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetCombinedRankInfo(entry, json);
            }
            break;

          case "Rank.Updated":
            {
              json = entry.json();
              onLabelRankUpdated(entry, json);
            }
            break;

          case "MythicRating.Updated":
            {
              json = entry.json();
              onLabelMythicRatingUpdated(entry, json);
            }
            break;

          case "Event.GetPlayerCourses":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCourses(entry, json);
            }
            break;

          case "Event.GetPlayerCoursesV2":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCoursesV2(entry, json);
            }
            break;

          case "Deck.GetDeckLists":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckGetDeckLists(entry, json);
            }
            break;

          case "Deck.GetDeckListsV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckGetDeckListsV3(entry, json);
            }
            break;

          case "Deck.GetPreconDecks":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckGetPreconDecks(entry, json);
            }
            break;

          case "Deck.UpdateDeck":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckUpdateDeck(entry, json);
            }
            break;

          case "Deck.UpdateDeckV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckUpdateDeckV3(entry, json);
            }
            break;

          case "Inventory.Updated":
            json = entry.json();
            onLabelInventoryUpdated(entry, json);
            break;

          case "PlayerInventory.GetPlayerInventory":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInPlayerInventoryGetPlayerInventory(entry, json);
            }
            break;

          case "PlayerInventory.GetPlayerCardsV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInPlayerInventoryGetPlayerCardsV3(entry, json);
            }
            break;

          case "Progression.GetPlayerProgress":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInProgressionGetPlayerProgress(entry, json);
            }
            break;

          case "TrackProgress.Updated":
            json = entry.json();
            onLabelTrackProgressUpdated(entry, json);
            break;

          case "TrackRewardTier.Updated":
            json = entry.json();
            onLabelTrackRewardTierUpdated(entry, json);
            break;

          case "Event.DeckSubmit":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventDeckSubmit(entry, json);
            }
            break;

          case "Event.DeckSubmitV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventDeckSubmitV3(entry, json);
            }
            break;

          case "Event.MatchCreated":
            json = entry.json();
            onLabelEventMatchCreated(entry, json);
            break;

          case "Event.AIPractice":
            if (entry.arrow == "==>") {
              json = entry.json();
              onLabelOutEventAIPractice(entry, json);
            }
            break;

          case "DirectGame.Challenge":
            if (entry.arrow == "==>") {
              json = entry.json();
              onLabelOutDirectGameChallenge(entry, json);
            }
            break;

          case "Draft.DraftStatus":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDraftDraftStatus(entry, json);
            }
            break;

          case "Draft.MakePick":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDraftMakePick(entry, json);
            } else {
              json = entry.json();
              onLabelOutDraftMakePick(entry, json);
            }
            break;

          case "Event.CompleteDraft":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventCompleteDraft(entry, json);
            }
            break;

          case "Event.GetActiveEventsV2":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetActiveEvents(entry, json);
            }
            break;

          case "MatchGameRoomStateChangedEvent":
            json = entry.json();
            onLabelMatchGameRoomStateChangedEvent(entry, json);
            break;

          case "Event.GetSeasonAndRankDetail":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetSeasonAndRankDetail(entry, json);
            }
            break;

          case "PlayerInventory.GetRewardSchedule":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelGetPlayerInventoryGetRewardSchedule(entry, json);
            }
            break;

          default:
            break;
        }
        if (entry.timestamp) {
          setData({
            last_log_timestamp: entry.timestamp,
            last_log_format: getDateFormat(entry.timestamp)
          });
        }
      } catch (err) {
        console.log(entry.label, entry.position, entry.json());
        console.error(err);
      }
    }
  }
}

function finishLoading() {
  if (globals.firstPass) {
    ipc_send("popup", {
      text: "Finishing initial log read...",
      time: 0,
      progress: 2
    });
    globals.firstPass = false;
    globals.store.set(playerData.data);
    logReadEnd = new Date();
    let logReadElapsed = (logReadEnd - globals.logReadStart) / 1000;
    ipc_send("ipc_log", `Log read in ${logReadElapsed}s`);

    ipc_send("popup", {
      text: "Initializing...",
      time: 0,
      progress: 2
    });

    if (globals.duringMatch) {
      ipc_send("set_arena_state", ARENA_MODE_MATCH);
      update_deck(false);
    } else if (globals.duringDraft) {
      ipc_send("set_arena_state", ARENA_MODE_DRAFT);
    }

    ipc_send("set_settings", JSON.stringify(playerData.settings));
    ipc_send("initialize");
    ipc_send("player_data_refresh");

    if (playerData.name) {
      httpApi.httpSetPlayer(
        playerData.name,
        playerData.rank.constructed.rank,
        playerData.rank.constructed.tier,
        playerData.rank.limited.rank,
        playerData.rank.limited.tier
      );
    }

    ipc_send("popup", {
      text: "Initialized successfully!",
      time: 3000,
      progress: -1
    });
  }
}

function updateLoading(entry) {
  if (globals.firstPass) {
    const completion = entry.position / entry.size;
    ipc_send("popup", {
      text: `Reading log: ${Math.round(100 * completion)}%`,
      time: 0,
      progress: completion
    });
  }
}

module.exports = {
  loadPlayerConfig,
  syncSettings,
  startWatchingLog
};

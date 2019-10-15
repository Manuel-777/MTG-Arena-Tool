const electron = require("electron");
const { remote, ipcRenderer: ipc } = require("electron");
const format = require("date-fns/format");

if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: error => {
      openNewGitHubIssue({
        user: "Manuel-777",
        repo: "MTG-Arena-Tool",
        body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
      });
    }
  });
  require("devtron").install();
  const Sentry = require("@sentry/electron");
  Sentry.init({
    dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
  });
}

const _ = require("lodash");
const path = require("path");
const Store = require("electron-store");
const fs = require("fs");
const sha1 = require("js-sha1");

const httpApi = require("./http-api");

const greToClientInterpreter = require("./gre-to-client-interpreter");
const Deck = require("../shared/deck");
const db = require("../shared/database");
const playerData = require("../shared/player-data");
const { hypergeometricRange } = require("../shared/stats-fns");
const {
  get_rank_index,
  getReadableFormat,
  objectClone
} = require("../shared/util");
const {
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE,
  DEFAULT_TILE,
  HIDDEN_PW,
  IPC_OVERLAY,
  MAIN_DECKS
} = require("../shared/constants");
const {
  getDateFormat,
  ipc_send,
  setData,
  unleakString,
  parseWotcTimeFallback
} = require("./background-util");
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

const {
  createDeck,
  createDraft,
  createMatch,
  completeMatch
} = require("./data");

const toolVersion = electron.remote.app
  .getVersion()
  .split(".")
  .reduce((acc, cur) => +acc * 256 + +cur);

const rememberCfg = {
  email: "",
  token: "",
  settings: {
    toolVersion: toolVersion,
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false,
    metadata_lang: "en",
    log_locale_format: ""
  }
};

const settingsCfg = {
  gUri: ""
};

var rstore = new Store({
  name: "remember",
  defaults: rememberCfg
});

var store = new Store({
  name: "default",
  defaults: playerData.defaultCfg
});

var settingsStore = new Store({
  name: "settings",
  defaults: settingsCfg
});

let logLoopInterval = null;
const debugArenaID = undefined;
const debugLog = false;
const debugNet = true;
var debugLogSpeed = 0.001;

const actionLogDir = path.join(
  (electron.app || electron.remote.app).getPath("userData"),
  "actionlogs"
);
if (!fs.existsSync(actionLogDir)) {
  fs.mkdirSync(actionLogDir);
}

var firstPass = true;
var tokenAuth = undefined;

var currentMatch = null;

var originalDeck = null;

var currentDeck = new Deck();
var duringMatch = false;
let duringDraft = false;
var matchBeginTime = 0;
var matchGameStats = [];
var matchCompletedOnGameNumber = 0;
var gameNumberCompleted = 0;
let initialLibraryInstanceIds = [];
let idChanges = {};
let instanceToCardIdMap = {};

var logLanguage = "English";
var lastDeckUpdate = new Date();

//
ipc.on("save_app_settings", function(event, arg) {
  ipc_send("show_loading");
  const rSettings = rstore.get("settings");
  rSettings.toolVersion = toolVersion;
  const updated = { ...rSettings, ...arg };

  if (!updated.remember_me) {
    rstore.set("email", "");
    rstore.set("token", "");
  }
  rstore.set("settings", updated);

  syncSettings(updated);
  ipc_send("hide_loading");
});

function fixBadSettingsData() {
  const appSettings = rstore.get("settings");

  // First introduced in 2.8.4 (2019-07-25)
  // Some people's date formats are set to "undefined"
  // These should be an empty string.
  if (appSettings.log_locale_format === "undefined") {
    appSettings.log_locale_format = "";
    rstore.set("settings", appSettings);
  }

  // Define new metadata language setting.
  if (appSettings.metadata_lang === undefined) {
    appSettings.metadata_lang = "en";
    rstore.set("settings", appSettings);
  }
  // include more fixes below. Be as specific
  // and conservitive as possible.
}

function downloadMetadata() {
  const appSettings = rstore.get("settings");
  httpApi.httpGetDatabase(appSettings.metadata_lang);
  ipc_send("popup", {
    text: `Downloading metadata ${appSettings.metadata_lang}`,
    time: 0
  });
}

ipc.on("download_metadata", downloadMetadata);

//
ipc.on("start_background", function() {
  fixBadSettingsData();

  // first time during bootstrapping that we load
  // app-level settings into singletons

  const appSettings = rstore.get("settings");
  const settings = { ...playerData.settings, ...appSettings, logUri };
  setData({ settings }, false);
  ipc_send("initial_settings", settings);

  // start initial log parse
  logLoopInterval = window.setInterval(attemptLogLoop, 250);

  // start http
  httpApi.httpBasic();
  httpApi.httpGetDatabaseVersion(appSettings.metadata_lang);
  ipc_send("popup", {
    text: `Downloading metadata ${appSettings.metadata_lang}`,
    time: 0
  });

  // Check if it is the first time we open this version
  if (
    appSettings.toolVersion == undefined ||
    toolVersion > appSettings.toolVersion
  ) {
    ipc_send("show_whats_new");
  }
});

function offlineLogin() {
  ipc_send("auth", { ok: true, user: -1 });
  loadPlayerConfig(playerData.arenaId);
  setData({ userName: "", offline: true });
}

//
ipc.on("login", function(event, arg) {
  if (arg.password == HIDDEN_PW) {
    tokenAuth = rstore.get("token");
    httpApi.httpAuth(arg.username, arg.password);
  } else if (arg.username === "" && arg.password === "") {
    offlineLogin();
  } else {
    tokenAuth = "";
    httpApi.httpAuth(arg.username, arg.password);
  }
});

//
ipc.on("unlink_discord", function(event, obj) {
  httpApi.httpDiscordUnlink();
});

//
ipc.on("request_draft_link", function(event, obj) {
  httpApi.httpDraftShareLink(obj.id, obj.expire, obj.draftData);
});

//
ipc.on("request_log_link", function(event, obj) {
  httpApi.httpLogShareLink(obj.id, obj.log, obj.expire);
});

//
ipc.on("request_deck_link", function(event, obj) {
  httpApi.httpDeckShareLink(obj.deckString, obj.expire);
});

//
ipc.on("windowBounds", (event, windowBounds) => {
  if (firstPass) return;
  setData({ windowBounds }, false);
  store.set("windowBounds", windowBounds);
});

//
ipc.on("overlayBounds", (event, index, bounds) => {
  const overlays = [...playerData.settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    bounds // new bounds
  };
  overlays[index] = newOverlay;
  setData({ settings: { ...playerData.settings, overlays } }, false);
  store.set("settings.overlays", overlays);
});

//
ipc.on("save_overlay_settings", function(event, settings) {
  // console.log("save_overlay_settings");
  if (settings.index === undefined) return;
  ipc_send("show_loading");

  const { index } = settings;
  const overlays = playerData.settings.overlays.map((overlay, _index) => {
    if (_index === index) {
      const updatedOverlay = { ...overlay, ...settings };
      delete updatedOverlay.index;
      return updatedOverlay;
    }
    return overlay;
  });

  const updated = { ...playerData.settings, overlays };
  store.set("settings", updated);
  syncSettings(updated);
  ipc_send("hide_loading");
});

//
ipc.on("save_user_settings", function(event, settings) {
  // console.log("save_user_settings");
  ipc_send("show_loading");
  let refresh = true;
  if (settings.skip_refresh) {
    delete settings.skip_refresh;
    refresh = false;
  }
  const updated = { ...playerData.settings, ...settings };
  store.set("settings", updated);
  syncSettings(updated, refresh);
  ipc_send("hide_loading");
});

//
ipc.on("delete_data", function() {
  httpApi.httpDeleteData();
});

//
ipc.on("import_custom_deck", function(event, arg) {
  ipc_send("show_loading");
  const data = JSON.parse(arg);
  const id = data.id;
  if (!id || playerData.deckExists(id)) return;
  const deckData = {
    ...createDeck(),
    ...data
  };
  addCustomDeck(deckData);
  ipc_send("force_open_tab", MAIN_DECKS);
  ipc_send("hide_loading");
});

//
ipc.on("toggle_deck_archived", function(event, arg) {
  ipc_send("show_loading");
  const id = arg;
  if (!playerData.deckExists(id)) return;
  const deckData = { ...playerData.deck(id) };
  deckData.archived = !deckData.archived;
  const decks = { ...playerData.decks, [id]: deckData };

  setData({ decks });
  store.set("decks." + id, deckData);
  ipc_send("hide_loading");
});

//
ipc.on("toggle_archived", function(event, arg) {
  ipc_send("show_loading");
  const id = arg;
  const item = playerData[id];
  if (!item) return;
  const data = { ...item };
  data.archived = !data.archived;

  setData({ [id]: data });
  store.set(id, data);
  ipc_send("hide_loading");
});

ipc.on("request_explore", function(event, arg) {
  if (playerData.userName === "") {
    ipc_send("offline", 1);
  } else {
    httpApi.httpGetExplore(arg);
  }
});

ipc.on("request_course", function(event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", (event, set) => {
  if (playerData.userName === "") {
    ipc_send("offline", 1);
  } else {
    httpApi.httpHomeGet(set);
  }
});

ipc.on("tou_get", function(event, arg) {
  httpApi.httpTournamentGet(arg);
});

ipc.on("tou_join", function(event, arg) {
  httpApi.httpTournamentJoin(arg.id, arg.deck, sha1(arg.pass));
});

ipc.on("tou_drop", function(event, arg) {
  httpApi.httpTournamentDrop(arg);
});

ipc.on("edit_tag", (event, arg) => {
  const { tag, color } = arg;
  setData({ tags_colors: { ...playerData.tags_colors, [tag]: color } });
  store.set("tags_colors." + tag, color);
  sendSettings();
});

ipc.on("delete_tag", (event, arg) => {
  const { deckid, tag } = arg;
  const deck = playerData.deck(deckid);
  if (!deck || !tag) return;
  if (!deck.tags || !deck.tags.includes(tag)) return;

  const tags = [...deck.tags];
  tags.splice(tags.indexOf(tag), 1);

  const decks_tags = { ...playerData.decks_tags, [deckid]: tags };
  setData({ decks_tags });
  store.set("decks_tags." + deckid, tags);
});

ipc.on("add_tag", (event, arg) => {
  const { deckid, tag } = arg;
  const deck = playerData.deck(deckid);
  if (!deck || !tag) return;
  if (getReadableFormat(deck.format) === tag) return;
  if (deck.tags && deck.tags.includes(tag)) return;

  const tags = [...deck.tags, tag];

  const decks_tags = { ...playerData.decks_tags, [deckid]: tags };
  setData({ decks_tags });
  store.set("decks_tags." + deckid, tags);
});

ipc.on("delete_history_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = playerData.match(matchid);
  if (!match || !tag) return;
  if (!match.tags || !match.tags.includes(tag)) return;

  const tags = [...match.tags];
  tags.splice(tags.indexOf(tag), 1);

  const matchData = { ...match, tags };

  setData({ [matchid]: matchData });
  store.set(matchid + ".tags", tags);
});

ipc.on("add_history_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = playerData.match(matchid);
  if (!match || !tag) return;
  if (match.tags && match.tags.includes(tag)) return;

  const tags = [...(match.tags || []), tag];

  setData({ [matchid]: { ...match, tags } });
  store.set(matchid + ".tags", tags);
  httpApi.httpSetDeckTag(tag, match.oppDeck.mainDeck, match.eventId);
});

let odds_sample_size = 1;
ipc.on("set_odds_samplesize", function(event, state) {
  odds_sample_size = state;
  forceDeckUpdate(false);
  update_deck(true);
});

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

  const savedData = store.get();
  const savedOverlays = savedData.settings.overlays || [];
  const appSettings = rstore.get("settings");
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

function syncUserData(data) {
  // Sync Events
  const courses_index = [...playerData.courses_index];
  data.courses
    .filter(doc => !playerData.eventExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      courses_index.push(id);
      if (debugLog || !firstPass) store.set(id, doc);
      setData({ [id]: doc }, false);
    });
  if (debugLog || !firstPass) store.set("courses_index", courses_index);

  // Sync Matches
  const matches_index = [...playerData.matches_index];
  data.matches
    .filter(doc => !playerData.matchExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      matches_index.push(id);
      if (debugLog || !firstPass) store.set(id, doc);
      setData({ [id]: doc }, false);
    });
  if (debugLog || !firstPass) store.set("matches_index", matches_index);

  // Sync Economy
  const economy_index = [...playerData.economy_index];
  data.economy
    .filter(doc => !playerData.transactionExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      economy_index.push(id);
      if (debugLog || !firstPass) store.set(id, doc);
      setData({ [id]: doc }, false);
    });
  if (debugLog || !firstPass) store.set("economy_index", economy_index);

  // Sync Drafts
  const draft_index = [...playerData.draft_index];
  data.drafts
    .filter(doc => !playerData.draftExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      draft_index.push(id);
      if (debugLog || !firstPass) store.set(id, doc);
      setData({ [id]: doc }, false);
    });
  if (debugLog || !firstPass) store.set("draft_index", draft_index);

  if (data.settings.tags_colors) {
    let newTags = data.settings.tags_colors;
    setData({ tags_colors: { ...newTags } });
    store.set("tags_colors", newTags);
  }

  setData({ courses_index, draft_index, economy_index, matches_index });
}

// Merges settings and updates singletons across processes
// (essentially fancy setData for settings field only)
// To persist changes, see "save_user_settings" or "save_app_settings"
function syncSettings(dirtySettings = {}, refresh = debugLog || !firstPass) {
  const settings = { ...playerData.settings, ...dirtySettings };
  setData({ settings }, refresh);
  if (refresh) ipc_send("set_settings", JSON.stringify(settings));
}

// Set a new log URI
ipc.on("set_log", function(event, arg) {
  if (watchingLog) {
    stopWatchingLog();
    stopWatchingLog = startWatchingLog();
  }
  logUri = arg;
  settingsStore.set("logUri", arg);
});

// Read the log
// Set variables to default first
const mtgaLog = require("./mtga-log");
let prevLogSize = 0;
let watchingLog = false;
let stopWatchingLog;

let logUri = mtgaLog.defaultLogUri();
let settingsLogUri = settingsStore.get("logUri");
if (settingsLogUri) {
  logUri = settingsLogUri;
}

if (typeof process.env.LOGFILE !== "undefined") {
  logUri = process.env.LOGFILE;
}

console.log(logUri);
const ArenaLogWatcher = require("./arena-log-watcher");

let logReadStart = null;
let logReadEnd = null;

function startWatchingLog() {
  logReadStart = new Date();
  return ArenaLogWatcher.start({
    path: logUri,
    chunkSize: 268435440,
    onLogEntry: onLogEntryFound,
    onError: err => console.error(err),
    onFinish: finishLoading
  });
}

function sendSettings() {
  let tags_colors = playerData.tags_colors;
  let settingsData = { tags_colors };
  httpApi.httpSetSettings(settingsData);
}

let skipMatch = false;

function onLogEntryFound(entry) {
  if (debugLog) {
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
    if (firstPass) {
      updateLoading(entry);
    }
    if ((firstPass && !playerData.settings.skip_firstpass) || !firstPass) {
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

// Old parser
async function attemptLogLoop() {
  try {
    await logLoop();
  } catch (err) {
    console.error(err);
  }
}

// Basic logic for reading the log file
async function logLoop() {
  //console.log("logLoop() start");
  //ipc_send("ipc_log", "logLoop() start");
  if (fs.existsSync(logUri)) {
    if (fs.lstatSync(logUri).isDirectory()) {
      ipc_send("no_log", logUri);
      ipc_send("popup", {
        text: "No log file found. Please include the file name too.",
        time: 1000
      });
      return;
    }
  } else {
    ipc_send("no_log", logUri);
    ipc_send("popup", { text: "No log file found.", time: 1000 });
    return;
  }

  if (!firstPass) {
    ipc_send("log_read", 1);
  }
  /*
  if (debugLog) {
    firstPass = false;
  }
*/

  const { size } = await mtgaLog.stat(logUri);

  if (size == undefined) {
    // Something went wrong obtaining the file size, try again later
    return;
  }

  const delta = Math.min(268435440, size - prevLogSize);

  if (delta === 0) {
    // The log has not changed since we last checked
    return;
  }

  const logSegment =
    delta > 0
      ? await mtgaLog.readSegment(logUri, prevLogSize, delta)
      : await mtgaLog.readSegment(logUri, 0, size);

  // We are looping only to get user data (processLogUser)
  // Process only the user data for initial loading (prior to log in)
  // Same logic as processLog() but without the processLogData() function
  const rawString = logSegment;
  var splitString = rawString.split("[UnityCrossThread");
  const parsedData = {};

  let detailedLogs = true;
  splitString.forEach(value => {
    //ipc_send("ipc_log", "Async: ("+index+")");

    // Check if logs are disabled
    let strCheck = "DETAILED LOGS: DISABLED";
    if (value.includes(strCheck)) {
      ipc_send("popup", {
        text: `Detailed logs disabled.
1) Open Arena (the game by WotC)
2) Go to the settings screen in Arena
3) Open the View Account screen
4) Enable Detailed logs.
5) Restart Arena.`,
        time: 0
      });
      detailedLogs = false;
    }

    // Get player Id
    strCheck = '"playerId": "';
    if (value.includes(strCheck)) {
      parsedData.arenaId = debugArenaID
        ? debugArenaID
        : unleakString(dataChop(value, strCheck, '"'));
    }

    // Get User name
    strCheck = '"screenName": "';
    if (value.includes(strCheck)) {
      parsedData.name = unleakString(dataChop(value, strCheck, '"'));
    }

    // Get Client Version
    strCheck = '"clientVersion": "';
    if (value.includes(strCheck)) {
      parsedData.arenaVersion = unleakString(dataChop(value, strCheck, '"'));
    }
    /*
    if (firstPass) {
      ipc_send("popup", {"text": "Reading: "+Math.round(100/splitString.length*index)+"%", "time": 1000});
    }
    */
  });

  if (!detailedLogs) return;

  for (let key in parsedData) {
    ipc_send("ipc_log", `Initial log parse: ${key}=${parsedData[key]}`);
  }
  setData(parsedData, false);

  prevLogSize = size;

  if (!playerData.arenaId || !playerData.name) {
    ipc_send("popup", {
      text: "output_log.txt contains no player data",
      time: 0
    });
    return;
  }

  ipc_send("popup", {
    text: "Found Arena log for " + playerData.name,
    time: 0
  });
  clearInterval(logLoopInterval);

  let username = "";
  let password = "";
  const { auto_login, remember_me } = playerData.settings;
  if (remember_me) {
    username = rstore.get("email");
    const token = rstore.get("token");
    if (username != "" && token != "") {
      password = HIDDEN_PW;
      tokenAuth = token;
    }
  }

  ipc_send("prefill_auth_form", {
    username,
    password,
    remember_me
  });
  ipc_send("show_login", true);

  if (auto_login) {
    ipc_send("toggle_login", false);
    if (remember_me && username && tokenAuth) {
      ipc_send("popup", {
        text: "Logging in automatically...",
        time: 0,
        progress: 2
      });
      httpApi.httpAuth(username, HIDDEN_PW);
    } else {
      ipc_send("popup", {
        text: "Launching offline mode automatically...",
        time: 0,
        progress: 2
      });
      offlineLogin();
    }
  }
}

function decodePayload(json) {
  const messages = require("./messages_pb");

  const msgType = json.clientToMatchServiceMessageType.split("_")[1],
    binaryMsg = new Buffer.from(json.payload, "base64");

  try {
    let msgDeserialiser;
    if (
      msgType === "ClientToGREMessage" ||
      msgType === "ClientToGREUIMessage"
    ) {
      msgDeserialiser = messages.ClientToGREMessage;
    } else if (msgType === "ClientToMatchDoorConnectRequest") {
      msgDeserialiser = messages.ClientToMatchDoorConnectRequest;
    } else if (msgType === "AuthenticateRequest") {
      msgDeserialiser = messages.AuthenticateRequest;
    } else if (msgType === "CreateMatchGameRoomRequest") {
      msgDeserialiser = messages.CreateMatchGameRoomRequest;
    } else if (msgType === "EchoRequest") {
      msgDeserialiser = messages.EchoRequest;
    } else {
      console.warn(`${msgType} - unknown message type`);
      return;
    }
    const msg = msgDeserialiser.deserializeBinary(binaryMsg);
    //console.log(json.msgType);
    //console.log(msg.toObject());
    return msg.toObject();
  } catch (e) {
    console.log(e.message);
  }

  return;
}

// Cuts the string "data" between first ocurrences of the two selected words "startStr" and "endStr";
function dataChop(data, startStr, endStr) {
  var start = data.indexOf(startStr) + startStr.length;
  var end = data.length;
  data = data.substring(start, end);

  if (endStr != "") {
    start = 0;
    end = data.indexOf(endStr);
    data = data.substring(start, end);
  }

  return data;
}

function actionLogGenerateLink(grpId) {
  var card = db.card(grpId);
  return '<log-card id="' + grpId + '">' + card.name + "</log-card>";
}

function actionLogGenerateAbilityLink(abId) {
  return `<log-ability id="${abId}">ability</log-ability>`;
}

var currentActionLog = "";

// Send action log data to overlay
function actionLog(seat, time, str, grpId = 0) {
  if (!time) time = new Date();
  if (seat == -99) {
    currentActionLog = "version: 1\r\n";
  } else {
    /*
    str = str.replace(/(<([^>]+)>)/gi, "");
    */

    currentActionLog += `${seat}\r\n`;
    currentActionLog += `${format(time, "HH:mm:ss")}\r\n`;
    currentActionLog += `${str}\r\n`;

    try {
      fs.writeFileSync(
        path.join(actionLogDir, currentMatch.matchId + ".txt"),
        currentActionLog,
        "utf-8"
      );
    } catch (e) {
      //
    }
  }

  //console.log("action_log", { seat: seat, time: time }, str);
  ipc_send(
    "action_log",
    { seat: seat, time: time, str: str, grpId: grpId },
    IPC_OVERLAY
  );
}

//
function changePriority(previous, current, time) {
  currentMatch.priorityTimers[previous] +=
    time - currentMatch.lastPriorityChangeTime;

  currentMatch.lastPriorityChangeTime = time;
  currentMatch.priorityTimers[0] = currentMatch.lastPriorityChangeTime;

  currentMatch.currentPriority = current;
  //console.log(priorityTimers);
  //console.log("since match begin:", time - matchBeginTime);
  ipc_send("set_priority_timer", currentMatch.priorityTimers, IPC_OVERLAY);
}

// Get player name by seat in the game
function getNameBySeat(seat) {
  try {
    if (seat == currentMatch.player.seat) {
      return playerData.name.slice(0, -6);
    } else {
      let oppName = currentMatch.opponent.name;
      if (oppName && oppName !== "Sparky") {
        oppName = oppName.slice(0, -6);
      }
      return oppName || "Opponent";
    }
  } catch (e) {
    return "???";
  }
}

//
function addCustomDeck(customDeck) {
  const id = customDeck.id;
  const deckData = {
    // preserve custom fields if possible
    ...(playerData.deck(id) || {}),
    ...customDeck
  };

  setData({ decks: { ...playerData.decks, [customDeck.id]: deckData } });
  if (debugLog || !firstPass) store.set("decks." + id, deckData);
}

// Create a match from data, set globals and trigger ipc
function processMatch(json, matchBeginTime) {
  actionLog(-99, new Date(), "");

  if (debugLog || !firstPass) {
    ipc_send("set_arena_state", ARENA_MODE_MATCH);
  }

  var match = createMatch(json, matchBeginTime);

  // set global values

  currentMatch = match;
  matchGameStats = [];
  matchCompletedOnGameNumber = 0;
  gameNumberCompleted = 0;
  initialLibraryInstanceIds = [];
  idChanges = {};
  instanceToCardIdMap = {};

  ipc_send("ipc_log", "vs " + match.opponent.name);
  ipc_send("set_timer", match.beginTime, IPC_OVERLAY);

  if (match.eventId == "DirectGame" && currentDeck) {
    let str = currentDeck.getSave();
    httpApi.httpTournamentCheck(str, match.opponent.name, true);
  }

  ipc_send("set_priority_timer", match.priorityTimers, IPC_OVERLAY);

  return match;
}

//
function select_deck(arg) {
  if (arg.CourseDeck) {
    currentDeck = new Deck(arg.CourseDeck);
  } else {
    currentDeck = new Deck(arg);
  }
  // console.log("Select deck: ", currentDeck, arg);
  originalDeck = currentDeck.clone();
  ipc_send("set_deck", currentDeck.getSave(), IPC_OVERLAY);
}

//
function clear_deck() {
  var deck = { mainDeck: [], sideboard: [], name: "" };
  ipc_send("set_deck", deck, IPC_OVERLAY);
}

//
function update_deck(force) {
  var nd = new Date();
  if ((debugLog || force || !firstPass) && nd - lastDeckUpdate > 1000) {
    forceDeckUpdate();

    let currentMatchCopy = objectClone(currentMatch);
    currentMatchCopy.oppCards = getOpponentDeck();
    currentMatchCopy.playerCardsLeft = currentMatch.playerCardsLeft.getSave();
    currentMatchCopy.playerCardsOdds = currentMatch.playerChances;
    currentMatchCopy.player.deck = currentMatch.player.deck.getSave();
    currentMatchCopy.player.originalDeck = currentMatch.player.originalDeck.getSave();
    delete currentMatchCopy.GREtoClient;
    delete currentMatchCopy.oppCardsUsed;
    delete currentMatchCopy.playerChances;
    delete currentMatchCopy.annotations;
    delete currentMatchCopy.gameObjs;
    delete currentMatchCopy.latestMessage;
    delete currentMatchCopy.processedAnnotations;
    delete currentMatchCopy.zones;
    currentMatchCopy = JSON.stringify(currentMatchCopy);
    ipc_send("set_match", currentMatchCopy, IPC_OVERLAY);
  }
}

function getBestArchetype(deck) {
  let bestMatch = "-";

  // Calculate worst possible deviation for this deck
  let mainDeviations = [];
  if (deck.mainboard.get().length == 0) return bestMatch;
  deck.mainboard.get().forEach(card => {
    let deviation = card.quantity;
    mainDeviations.push(deviation * deviation);
  });
  let lowestDeviation = Math.sqrt(
    mainDeviations.reduce((a, b) => a + b) / (mainDeviations.length - 1)
  );
  let highest = lowestDeviation; //err..

  // Test for each archetype
  db.archetypes.forEach(arch => {
    //console.log(arch.name);
    mainDeviations = [];
    deck.mainboard.get().forEach(card => {
      //let q = card.quantity;
      let name = db.card(card.id).name;
      let archMain = arch.average.mainDeck;

      let deviation = 1 - (archMain[name] ? 1 : 0); // archMain[name] ? archMain[name] : 0 // for full data
      mainDeviations.push(deviation * deviation);
      //console.log(name, deviation, q, archMain[name]);
    });
    let averageDeviation =
      mainDeviations.reduce((a, b) => a + b) / (mainDeviations.length - 1);
    let finalDeviation = Math.sqrt(averageDeviation);

    if (finalDeviation < lowestDeviation) {
      lowestDeviation = finalDeviation;
      bestMatch = arch;
    }
    //console.log(">>", averageDeviation, Math.sqrt(averageDeviation));
  });

  if (lowestDeviation > highest * 0.5) {
    return "Unknown";
  }

  return bestMatch.name;
}

function getColorArchetype(c) {
  if (c.length == 1) {
    if (c.w) return "Mono White";
    if (c.u) return "Mono Blue";
    if (c.b) return "Mono Black";
    if (c.g) return "Mono Green";
    if (c.r) return "Mono Red";
  } else if (c.length == 2) {
    if (c.w && c.u) return "Azorius";
    if (c.b && c.r) return "Rakdos";
    if (c.g && c.w) return "Selesnya";
    if (c.u && c.b) return "Dimir";
    if (c.r && c.g) return "Gruul";
    if (c.w && c.b) return "Orzhov";
    if (c.u && c.r) return "Izzet";
    if (c.b && c.g) return "Golgari";
    if (c.r && c.w) return "Boros";
    if (c.g && c.u) return "Simic";
  } else if (c.length == 3) {
    if (c.w && c.u && c.b) return "Esper";
    if (c.u && c.b && c.r) return "Grixis";
    if (c.b && c.r && c.g) return "Jund";
    if (c.r && c.g && c.w) return "Naya";
    if (c.g && c.w && c.u) return "Bant";
    if (c.g && c.w && c.b) return "Abzan";
    if (c.w && c.u && c.r) return "Jeskai";
    if (c.u && c.b && c.g) return "Sultai";
    if (c.b && c.r && c.w) return "Mardu";
    if (c.r && c.g && c.u) return "Temur";
  } else if (c.length == 4) {
    if (c.w && c.u && c.b && c.r) return "WUBR";
    if (c.u && c.b && c.r && c.g) return "UBRG";
    if (c.w && c.b && c.r && c.g) return "WBRG";
    if (c.w && c.u && c.r && c.g) return "WURG";
    if (c.w && c.u && c.b && c.g) return "WUBG";
  } else if (c.length == 5) {
    return "5-color";
  }
}

//
function getOpponentDeck() {
  let _deck = new Deck({}, currentMatch.oppCardsUsed, false);
  _deck.mainboard.removeDuplicates(true);
  _deck.getColors();

  let format = db.events_format[currentMatch.eventId];
  currentMatch.opponent.deck.archetype = "-";
  let deckSave = _deck.getSave();

  currentMatch.oppArchetype = getBestArchetype(_deck);
  if (
    (format !== "Standard" && format !== "Traditional Standard") ||
    currentMatch.oppArchetype == "Unknown"
  ) {
    // console.log(_deck);
    // console.log(_deck.colors);
    currentMatch.oppArchetype = getColorArchetype(_deck.colors);
  }
  deckSave.archetype = currentMatch.oppArchetype;

  return deckSave;
}

//
function forceDeckUpdate(removeUsed = true) {
  var decksize = 0;
  var cardsleft = 0;
  var typeCre = 0;
  var typeIns = 0;
  var typeSor = 0;
  var typePla = 0;
  var typeArt = 0;
  var typeEnc = 0;
  var typeLan = 0;

  currentMatch.playerCardsLeft = currentMatch.player.deck.clone();

  if (debugLog || !firstPass) {
    currentMatch.playerCardsLeft.mainboard.get().forEach(card => {
      card.total = card.quantity;
      decksize += card.quantity;
      cardsleft += card.quantity;
    });

    if (removeUsed) {
      cardsleft -= currentMatch.playerCardsUsed.length;
      currentMatch.playerCardsUsed.forEach(grpId => {
        currentMatch.playerCardsLeft.mainboard.remove(grpId, 1);
      });
    }
    let main = currentMatch.playerCardsLeft.mainboard;
    main.addProperty("chance", card =>
      Math.round(
        hypergeometricRange(
          1,
          Math.min(odds_sample_size, card.quantity),
          cardsleft,
          odds_sample_size,
          card.quantity
        ) * 100
      )
    );

    typeLan = main.countType("Land");
    typeCre = main.countType("Creature");
    typeArt = main.countType("Artifact");
    typeEnc = main.countType("Enchantment");
    typeIns = main.countType("Instant");
    typeSor = main.countType("Sorcery");
    typePla = main.countType("Planeswalker");

    let chancesObj = {};
    let landsCount = main.getLandsAmounts();
    chancesObj.landW = chanceType(landsCount.w, cardsleft, odds_sample_size);
    chancesObj.landU = chanceType(landsCount.u, cardsleft, odds_sample_size);
    chancesObj.landB = chanceType(landsCount.b, cardsleft, odds_sample_size);
    chancesObj.landR = chanceType(landsCount.r, cardsleft, odds_sample_size);
    chancesObj.landG = chanceType(landsCount.g, cardsleft, odds_sample_size);

    chancesObj.chanceCre = chanceType(typeCre, cardsleft, odds_sample_size);
    chancesObj.chanceIns = chanceType(typeIns, cardsleft, odds_sample_size);
    chancesObj.chanceSor = chanceType(typeSor, cardsleft, odds_sample_size);
    chancesObj.chancePla = chanceType(typePla, cardsleft, odds_sample_size);
    chancesObj.chanceArt = chanceType(typeArt, cardsleft, odds_sample_size);
    chancesObj.chanceEnc = chanceType(typeEnc, cardsleft, odds_sample_size);
    chancesObj.chanceLan = chanceType(typeLan, cardsleft, odds_sample_size);

    chancesObj.deckSize = decksize;
    chancesObj.cardsLeft = cardsleft;
    currentMatch.playerChances = chancesObj;
  } else {
    let main = currentMatch.playerCardsLeft.mainboard;
    main.addProperty("chance", () => 1);

    let chancesObj = {};
    chancesObj.landW = 0;
    chancesObj.landU = 0;
    chancesObj.landB = 0;
    chancesObj.landR = 0;
    chancesObj.landG = 0;
    chancesObj.chanceCre = 0;
    chancesObj.chanceIns = 0;
    chancesObj.chanceSor = 0;
    chancesObj.chancePla = 0;
    chancesObj.chanceArt = 0;
    chancesObj.chanceEnc = 0;
    chancesObj.chanceLan = 0;
    currentMatch.playerChances = chancesObj;
  }
}

function chanceType(quantity, cardsleft, odds_sample_size) {
  return (
    Math.round(
      hypergeometricRange(
        1,
        Math.min(odds_sample_size, quantity),
        cardsleft,
        odds_sample_size,
        quantity
      ) * 1000
    ) / 10
  );
}

//
function saveEconomyTransaction(transaction) {
  const id = transaction.id;
  const txnData = {
    // preserve custom fields if possible
    ...(playerData.transaction(id) || {}),
    ...transaction
  };

  if (!playerData.economy_index.includes(id)) {
    const economy_index = [...playerData.economy_index, id];
    if (debugLog || !firstPass) store.set("economy_index", economy_index);
    setData({ economy_index }, false);
  }

  if (debugLog || !firstPass) store.set(id, txnData);
  setData({ [id]: txnData });
  httpApi.httpSetEconomy(txnData);
}

//
function saveCourse(json) {
  const id = json._id;
  delete json._id;
  json.id = id;
  const eventData = {
    date: new Date(),
    // preserve custom fields if possible
    ...(playerData.event(id) || {}),
    ...json
  };

  if (!playerData.courses_index.includes(id)) {
    const courses_index = [...playerData.courses_index, id];
    if (debugLog || !firstPass) store.set("courses_index", courses_index);
    setData({ courses_index }, false);
  }

  if (debugLog || !firstPass) store.set(id, eventData);
  setData({ [id]: eventData });
}

//
function saveMatch(id, matchEndTime) {
  //console.log(currentMatch.matchId, id);
  if (!currentMatch || !currentMatch.matchTime || currentMatch.matchId !== id) {
    return;
  }
  const existingMatch = playerData.match(id) || {};
  const match = completeMatch(existingMatch, currentMatch, matchEndTime);
  if (!match) {
    return;
  }

  // console.log("Save match:", match);
  if (!playerData.matches_index.includes(id)) {
    const matches_index = [...playerData.matches_index, id];
    if (debugLog || !firstPass) store.set("matches_index", matches_index);
    setData({ matches_index }, false);
  }

  if (debugLog || !firstPass) store.set(id, match);
  setData({ [id]: match });
  if (matchCompletedOnGameNumber === gameNumberCompleted) {
    httpApi.httpSetMatch(match);
  }
  ipc_send("set_timer", 0, IPC_OVERLAY);
  ipc_send("popup", { text: "Match saved!", time: 3000 });
}

//
function startDraft() {
  if (debugLog || !firstPass) {
    if (playerData.settings.close_on_match) {
      ipc_send("renderer_hide", 1);
    }
    ipc_send("set_arena_state", ARENA_MODE_DRAFT);
  }
  duringDraft = true;
}

function getDraftData(id, entry) {
  var data = playerData.draft(id) || createDraft(id, entry);

  if (!data.date && entry.timestamp) {
    // the first event we see we set the date.
    data.timestamp = entry.timestamp;
    data.date = parseWotcTimeFallback(entry.timestamp);
  }

  return data;
}

//
function setDraftData(data) {
  if (!data || !data.id) {
    console.log("Couldnt save undefined draft:", data);
    return;
  }
  const { id } = data;

  // console.log("Set draft data:", data);
  if (!playerData.draft_index.includes(id)) {
    const draft_index = [...playerData.draft_index, id];
    if (debugLog || !firstPass) store.set("draft_index", draft_index);
    setData({ draft_index }, false);
  }

  if (debugLog || !firstPass) store.set(id, data);
  setData({
    [id]: data,
    cards: playerData.cards,
    cardsNew: playerData.cardsNew
  });
  ipc_send("set_draft_cards", data, IPC_OVERLAY);
}

//
function clearDraftData(draftId) {
  if (playerData.draftExists(draftId)) {
    if (playerData.draft_index.includes(draftId)) {
      const draft_index = [...playerData.draft_index];
      draft_index.splice(draft_index.indexOf(draftId), 1);
      setData({ draft_index }, false);
      if (debugLog || !firstPass) store.set("draft_index", draft_index);
    }
    setData({ [draftId]: null });
    // Note: we must always run delete, regardless of firstpass
    store.delete(draftId);
  }
}

//
function endDraft(data) {
  duringDraft = false;
  if (debugLog || !firstPass) ipc_send("set_arena_state", ARENA_MODE_IDLE);
  if (!data) return;
  httpApi.httpSetDraft(data);
  ipc_send("popup", { text: "Draft saved!", time: 3000 });
}

//
function updateLoading(entry) {
  if (firstPass) {
    const completion = entry.position / entry.size;
    ipc_send("popup", {
      text: `Reading log: ${Math.round(100 * completion)}%`,
      time: 0,
      progress: completion
    });
  }
}

//
function finishLoading() {
  if (firstPass) {
    ipc_send("popup", {
      text: "Finishing initial log read...",
      time: 0,
      progress: 2
    });
    firstPass = false;
    store.set(playerData.data);
    logReadEnd = new Date();
    let logReadElapsed = (logReadEnd - logReadStart) / 1000;
    ipc_send("ipc_log", `Log read in ${logReadElapsed}s`);

    ipc_send("popup", {
      text: "Initializing...",
      time: 0,
      progress: 2
    });

    if (duringMatch) {
      ipc_send("set_arena_state", ARENA_MODE_MATCH);
      update_deck(false);
    } else if (duringDraft) {
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

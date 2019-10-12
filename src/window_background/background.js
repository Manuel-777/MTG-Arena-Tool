const { remote, ipcRenderer: ipc } = require("electron");

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
}

const Store = require("electron-store");
const fs = require("fs");
const sha1 = require("js-sha1");

const httpApi = require("./http-api");

const playerData = require("../shared/player-data");
const { getReadableFormat } = require("../shared/util");
const { HIDDEN_PW, MAIN_DECKS } = require("../shared/constants");
const { ipc_send, setData, unleakString } = require("./background-util");

const { createDeck } = require("./data");

const globals = require("./globals");

const settingsCfg = {
  gUri: ""
};

var settingsStore = new Store({
  name: "settings",
  defaults: settingsCfg
});

let logLoopInterval = null;
const debugArenaID = undefined;

const addCustomDeck = require("./addCustomDeck");
const forceDeckUpdate = require("./forceDeckUpdate");
const {
  loadPlayerConfig,
  syncSettings,
  startWatchingLog
} = require("./loadPlayerConfig");
const update_deck = require("./updateDeck");

//
ipc.on("save_app_settings", function(event, arg) {
  ipc_send("show_loading");
  const rSettings = globals.rStore.get("settings");
  rSettings.toolVersion = globals.toolVersion;
  const updated = { ...rSettings, ...arg };

  if (!updated.remember_me) {
    globals.rStore.set("email", "");
    globals.rStore.set("token", "");
  }
  globals.rStore.set("settings", updated);

  syncSettings(updated);
  ipc_send("hide_loading");
});

function fixBadSettingsData() {
  const appSettings = globals.rStore.get("settings");

  // First introduced in 2.8.4 (2019-07-25)
  // Some people's date formats are set to "undefined"
  // These should be an empty string.
  if (appSettings.log_locale_format === "undefined") {
    appSettings.log_locale_format = "";
    globals.rStore.set("settings", appSettings);
  }

  // Define new metadata language setting.
  if (appSettings.metadata_lang === undefined) {
    appSettings.metadata_lang = "en";
    globals.rStore.set("settings", appSettings);
  }
  // include more fixes below. Be as specific
  // and conservitive as possible.
}

function downloadMetadata() {
  const appSettings = globals.rStore.get("settings");
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

  const appSettings = globals.rStore.get("settings");
  const settings = {
    ...playerData.settings,
    ...appSettings,
    logUri: globals.logUri
  };
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
    globals.toolVersion > appSettings.toolVersion
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
    globals.tokenAuth = globals.rStore.get("token");
    httpApi.httpAuth(arg.username, arg.password);
  } else if (arg.username === "" && arg.password === "") {
    offlineLogin();
  } else {
    globals.tokenAuth = "";
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
  if (globals.firstPass) return;
  setData({ windowBounds }, false);
  globals.store.set("windowBounds", windowBounds);
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
  globals.store.set("settings.overlays", overlays);
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
  globals.store.set("settings", updated);
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
  globals.store.set("settings", updated);
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
  globals.store.set("decks." + id, deckData);
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
  globals.store.set(id, data);
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
  globals.store.set("tags_colors." + tag, color);
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
  globals.store.set("decks_tags." + deckid, tags);
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
  globals.store.set("decks_tags." + deckid, tags);
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
  globals.store.set(matchid + ".tags", tags);
});

ipc.on("add_history_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = playerData.match(matchid);
  if (!match || !tag) return;
  if (match.tags && match.tags.includes(tag)) return;

  const tags = [...(match.tags || []), tag];

  setData({ [matchid]: { ...match, tags } });
  globals.store.set(matchid + ".tags", tags);
  httpApi.httpSetDeckTag(tag, match.oppDeck.mainDeck, match.eventId);
});

ipc.on("set_odds_samplesize", function(event, state) {
  globals.odds_sample_size = state;
  forceDeckUpdate(false);
  update_deck(true);
});

// Set a new log URI
ipc.on("set_log", function(event, arg) {
  if (globals.watchingLog) {
    globals.stopWatchingLog();
    globals.stopWatchingLog = startWatchingLog();
  }
  globals.logUri = arg;
  settingsStore.set("logUri", arg);
});

// Read the log
// Set variables to default first
let prevLogSize = 0;

let settingsLogUri = settingsStore.get("logUri");
if (settingsLogUri) {
  globals.logUri = settingsLogUri;
}

if (typeof process.env.LOGFILE !== "undefined") {
  globals.logUri = process.env.LOGFILE;
}

console.log(globals.logUri);

function sendSettings() {
  let tags_colors = playerData.tags_colors;
  let settingsData = { tags_colors };
  httpApi.httpSetSettings(settingsData);
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
  if (fs.existsSync(globals.logUri)) {
    if (fs.lstatSync(globals.logUri).isDirectory()) {
      ipc_send("no_log", globals.logUri);
      ipc_send("popup", {
        text: "No log file found. Please include the file name too.",
        time: 1000
      });
      return;
    }
  } else {
    ipc_send("no_log", globals.logUri);
    ipc_send("popup", { text: "No log file found.", time: 1000 });
    return;
  }

  if (!globals.firstPass) {
    ipc_send("log_read", 1);
  }
  /*
  if (globals.debugLog) {
    globals.firstPass = false;
  }
*/

  const { size } = await global.mtgaLog.stat(globals.logUri);

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
      ? await global.mtgaLog.readSegment(globals.logUri, prevLogSize, delta)
      : await global.mtgaLog.readSegment(globals.logUri, 0, size);

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
    if (globals.firstPass) {
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
    username = globals.rStore.get("email");
    const token = globals.rStore.get("token");
    if (username != "" && token != "") {
      password = HIDDEN_PW;
      globals.tokenAuth = token;
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
    if (remember_me && username && globals.tokenAuth) {
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
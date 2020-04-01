/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
import { app, ipcRenderer as ipc, remote } from "electron";
import fs from "fs";
import _ from "lodash";
import path from "path";
import {
  HIDDEN_PW,
  IPC_RENDERER,
  IPC_ALL,
  IPC_BACKGROUND
} from "../shared/constants";
import { appDb, playerDb } from "../shared/db/LocalDatabase";
import { InternalDeck } from "../types/Deck";
import addCustomDeck from "./addCustomDeck";
import arenaLogWatcher from "./arena-log-watcher";
import { ipcSend, setData, unleakString } from "./backgroundUtil";
import { createDeck } from "./data";
import forceDeckUpdate from "./forceDeckUpdate";
import globals from "./globals";
import * as httpApi from "./httpApi";
import { loadPlayerConfig, syncSettings } from "./loadPlayerConfig";
import * as mtgaLog from "./mtgaLog";
import updateDeck from "./updateDeck";
import {
  initializeRendererReduxIPC,
  reduxAction
} from "../shared-redux/sharedRedux";
import { archive, getMatch, deckExists, getDeck } from "../shared-store";
import { AppState } from "../shared-redux/stores/backgroundStore";

initializeRendererReduxIPC(globals.store);

let oldState: AppState;

globals.store.subscribe(() => {
  const newState = globals.store.getState();
  if (!oldState) {
    oldState = newState;
    return;
  }
  //console.log("Store updated");
  // Save settings only when they change
  const newSettings = newState.settings;
  if (!_.isEqual(oldState.settings, newSettings)) {
    //console.log(".settings updated");
    playerDb.upsert("", "settings", newSettings);
  }

  // App settings
  const newAppSettings = { ...newState.appsettings };
  if (!_.isEqual(oldState.appsettings, newAppSettings)) {
    newAppSettings.toolVersion = globals.toolVersion;
    //console.log(".appsettings updated");
    if (!newAppSettings.rememberMe) {
      appDb.upsert("", "settings", { ...newAppSettings, email: "", token: "" });
    } else {
      appDb.upsert("", "settings", newAppSettings);
    }
  }

  // Deck tags
  const newDeckTags = newState.playerdata.deckTags;
  if (!_.isEqual(oldState.playerdata.deckTags, newDeckTags)) {
    //console.log(".deck_tags updated");
    playerDb.upsert("", "deck_tags", newDeckTags);
  }
  oldState = newState;

  // Tags colors
  const newColors = newState.playerdata.tagsColors;
  if (!_.isEqual(oldState.playerdata.tagsColors, newColors)) {
    //console.log(".tags_colors updated");
    playerDb.upsert("", "tags_colors", newColors);
  }
  oldState = newState;
});

globals.actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);
if (!fs.existsSync(globals.actionLogDir)) {
  fs.mkdirSync(globals.actionLogDir);
}

globals.toolVersion = parseInt(
  (app || remote.app)
    .getVersion()
    .split(".")
    .reduce((acc, cur) => +acc * 256 + +cur + "")
);

let logLoopInterval: number | undefined = undefined;
const debugArenaID = undefined;

ipc.on("download_metadata", () => {
  const lang = globals.store.getState().appsettings.metadataLang;
  httpApi.httpGetDatabaseVersion(lang);
});

//
ipc.on("start_background", async function() {
  appDb.init("application");
  reduxAction(
    globals.store.dispatch,
    "SET_APPDB",
    appDb.filePath,
    IPC_RENDERER
  );

  const appSettings = await appDb.find("", "settings");
  let logUri = appSettings.logUri;

  if (typeof process.env.LOGFILE !== "undefined") {
    logUri = process.env.LOGFILE;
  }
  if (!logUri) {
    logUri = mtgaLog.defaultLogUri();
  }

  ipcSend("initialize_main", appSettings.launchToTray);
  //reduxAction(globals.store.dispatch, "SET_SETTINGS", appSettings, IPC_ALL ^ IPC_BACKGROUND);
  reduxAction(
    globals.store.dispatch,
    "SET_APP_SETTINGS",
    appSettings,
    IPC_ALL ^ IPC_BACKGROUND
  );

  // start initial log parse
  logLoopInterval = window.setInterval(attemptLogLoop, 250);

  // start http
  httpApi.initHttpQueue();
  httpApi.httpGetDatabaseVersion(appSettings.metadataLang);
  ipcSend("ipc_log", `Downloading metadata ${appSettings.metadataLang}`);
});

function offlineLogin(): void {
  ipcSend("auth", { ok: true, user: -1 });
  loadPlayerConfig();
  reduxAction(
    globals.store.dispatch,
    "SET_APP_SETTINGS",
    { email: "" },
    IPC_ALL ^ IPC_BACKGROUND
  );
  reduxAction(globals.store.dispatch, "SET_OFFLINE", true, IPC_RENDERER);
}

//
ipc.on("login", function(event, arg) {
  ipcSend("begin_login", {});
  if (arg.password == HIDDEN_PW) {
    httpApi.httpAuth(arg.username, arg.password);
  } else if (arg.username === "" && arg.password === "") {
    offlineLogin();
  } else {
    httpApi.httpAuth(arg.username, arg.password);
  }
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
  playerDb.upsert("", "windowBounds", windowBounds);
});

//
ipc.on("overlayBounds", (event, index, bounds) => {
  const overlays = [...globals.store.getState().settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    bounds // new bounds
  };
  overlays[index] = newOverlay;
  setData(
    { settings: { ...globals.store.getState().settings, overlays } },
    false
  );
  playerDb.upsert("settings", "overlays", overlays);
});

//
ipc.on("save_overlay_settings", function(event, settings) {
  // console.log("save_overlay_settings");
  if (settings.index === undefined) return;

  const { index } = settings;
  const overlays = globals.store
    .getState()
    .settings.overlays.map((overlay, _index) => {
      if (_index === index) {
        const updatedOverlay = { ...overlay, ...settings };
        delete updatedOverlay.index;
        return updatedOverlay;
      }
      return overlay;
    });

  const updated = { ...globals.store.getState().settings, overlays };
  playerDb.upsert("settings", "overlays", overlays);
  syncSettings(updated);
});

//
ipc.on("delete_data", function() {
  httpApi.httpDeleteData();
});

//
ipc.on("import_custom_deck", function(event, arg) {
  const data = JSON.parse(arg);
  const id = data.id;
  if (!id || deckExists(id)) return;
  const deckData = {
    ...createDeck(),
    ...data
  };
  addCustomDeck(deckData);
});

//
ipc.on("toggle_deck_archived", function(event, arg) {
  const id = arg;
  const deck = getDeck(id);
  if (!deck) return;
  const deckData: InternalDeck = { ...deck, archived: !deck.archived };

  reduxAction(globals.store.dispatch, "SET_DECK", deckData, IPC_RENDERER);
  playerDb.upsert("decks", id, deckData);
});

//
ipc.on("toggle_archived", function(event, id) {
  const data = archive(id);
  if (data) {
    playerDb.upsert("", id, data);
  }
});

ipc.on("request_explore", function(event, arg) {
  if (globals.store.getState().appsettings.email === "") {
    reduxAction(globals.store.dispatch, "SET_OFFLINE", true, IPC_RENDERER);
  } else {
    httpApi.httpGetExplore(arg);
  }
});

ipc.on("request_course", function(event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", (event, set) => {
  if (globals.store.getState().appsettings.email === "") {
    reduxAction(globals.store.dispatch, "SET_OFFLINE", true, IPC_RENDERER);
  } else {
    httpApi.httpHomeGet(set);
  }
});

ipc.on("edit_tag", (event, arg) => {
  const { tag, color } = arg;
  const tags = {
    ...globals.store.getState().playerdata.tagsColors,
    [tag]: color
  };
  playerDb.upsert("", "tags_colors", tags);
  reduxAction(globals.store.dispatch, "EDIT_TAG_COLOR", arg, IPC_RENDERER);
  //sendSettings();
});

ipc.on("delete_matches_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = getMatch(matchid);
  if (!match || !tag) return;
  if (!match.tags || !match.tags.includes(tag)) return;

  const tags = [...match.tags];
  tags.splice(tags.indexOf(tag), 1);
  const matchData = { ...match, tags };

  reduxAction(globals.store.dispatch, "SET_MATCH", matchData, IPC_RENDERER);
  playerDb.upsert(matchid, "tags", tags);
});

ipc.on("add_matches_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = getMatch(matchid);
  if (!match || !tag) return;
  if (match.tags && match.tags.includes(tag)) return;

  const tags = [...(match.tags || []), tag];
  const matchData = { ...match, tags };

  reduxAction(globals.store.dispatch, "SET_MATCH", matchData, IPC_RENDERER);
  playerDb.upsert(matchid, "tags", tags);
  httpApi.httpSetDeckTag(tag, match.oppDeck, match.eventId);
});

ipc.on("set_odds_samplesize", function(event, state) {
  globals.oddsSampleSize = state;
  forceDeckUpdate(false);
  updateDeck(true);
});

// Set a new log URI
ipc.on("set_log", function(event, arg) {
  if (globals.watchingLog) {
    globals.stopWatchingLog();
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(arg);
  }
  appDb.upsert("", "settings.logUri", arg).then(() => {
    remote.app.relaunch();
    remote.app.exit(0);
  });
});

// Read the log
// Set variables to default first
let prevLogSize = 0;

function sendSettings(): void {
  const settingsData = {
    tags_colors: globals.store.getState().playerdata.tagsColors
  };
  httpApi.httpSetSettings(settingsData);
}

// Old parser
async function attemptLogLoop(): Promise<void> {
  try {
    await logLoop();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

// Basic logic for reading the log file
async function logLoop(): Promise<void> {
  const logUri = globals.store.getState().appsettings.logUri;
  //console.log("logLoop() start");
  //ipcSend("ipc_log", "logLoop() start");
  if (fs.existsSync(logUri)) {
    if (fs.lstatSync(logUri).isDirectory()) {
      ipcSend("no_log", logUri);
      ipcSend("popup", {
        text: "No log file found. Please include the file name too.",
        time: 1000
      });
      return;
    }
  } else {
    ipcSend("no_log", logUri);
    ipcSend("popup", { text: "No log file found.", time: 1000 });
    return;
  }

  if (!globals.firstPass) {
    ipcSend("log_read", 1);
  }

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
  const splitString = rawString.split("[UnityCrossThread");
  const parsedData: Record<string, string | undefined> = {
    arenaId: undefined,
    name: undefined,
    arenaVersion: undefined
  };

  let detailedLogs = true;
  splitString.forEach(value => {
    // Check if detailed logs / plugin support is disabled
    // This should be an action rather than a simple popup
    // Renderer should display a special popup with pretty instructions
    let strCheck = "DETAILED LOGS: DISABLED";
    if (value.includes(strCheck)) {
      ipcSend("popup", {
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
    strCheck = '\\"playerId\\": \\"';
    if (value.includes(strCheck) && parsedData.arenaId == undefined) {
      parsedData.arenaId =
        debugArenaID ?? unleakString(dataChop(value, strCheck, '\\"'));
    }

    // Get User name
    strCheck = '\\"screenName\\": \\"';
    if (value.includes(strCheck) && parsedData.playerName == undefined) {
      parsedData.playerName = unleakString(dataChop(value, strCheck, '\\"'));
    }

    // Get Client Version
    strCheck = '\\"clientVersion\\": \\"';
    if (value.includes(strCheck) && parsedData.arenaVersion == undefined) {
      parsedData.arenaVersion = unleakString(dataChop(value, strCheck, '\\"'));
    }
    /*
    if (globals.firstPass) {
      ipcSend("popup", {"text": "Reading: "+Math.round(100/splitString.length*index)+"%", "time": 1000});
    }
    */
  });

  if (!detailedLogs) return;

  for (const key in parsedData) {
    ipcSend("ipc_log", `Initial log parse: ${key}=${parsedData[key]}`);
  }

  prevLogSize = size;
  const { arenaId, playerName, arenaVersion } = parsedData;
  if (!arenaId || !playerName) {
    ipcSend("popup", {
      text: "output_log.txt contains no player data",
      time: 0
    });
    return;
  } else {
    reduxAction(globals.store.dispatch, "SET_PLAYER_ID", arenaId, IPC_RENDERER);
    reduxAction(
      globals.store.dispatch,
      "SET_PLAYER_NAME",
      playerName,
      IPC_RENDERER
    );
    reduxAction(
      globals.store.dispatch,
      "SET_ARENA_VERSION",
      arenaVersion,
      IPC_RENDERER
    );
  }

  ipcSend("popup", {
    text: "Found Arena log for " + playerName,
    time: 0
  });
  clearInterval(logLoopInterval);

  const {
    autoLogin,
    rememberMe,
    email,
    token
  } = globals.store.getState().appsettings;
  let username = "";
  let password = "";
  if (rememberMe) {
    username = email;
    if (email && token) {
      password = HIDDEN_PW;
    }
  }

  ipcSend("prefill_auth_form", {
    username,
    password,
    rememberMe
  });

  if (autoLogin) {
    ipcSend("toggle_login", false);
    if (rememberMe && username && token) {
      ipcSend("popup", {
        text: "Logging in automatically...",
        time: 0,
        progress: 2
      });
      httpApi.httpAuth(username, HIDDEN_PW);
    } else {
      ipcSend("popup", {
        text: "Launching offline mode automatically...",
        time: 0,
        progress: 2
      });
      offlineLogin();
    }
  }
}

// Cuts the string "data" between first ocurrences of the two selected words "startStr" and "endStr";
function dataChop(data: string, startStr: string, endStr: string): string {
  let start = data.indexOf(startStr) + startStr.length;
  let end = data.length;
  data = data.substring(start, end);

  if (endStr != "") {
    start = 0;
    end = data.indexOf(endStr);
    data = data.substring(start, end);
  }

  return data;
}

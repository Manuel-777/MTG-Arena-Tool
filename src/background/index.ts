/* eslint-disable require-atomic-updates */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
import { app, ipcRenderer as ipc, remote } from "electron";
import fs from "fs";
import _ from "lodash";
import path from "path";
import { appDb, playerDb } from "../shared/db/LocalDatabase";
import addCustomDeck from "./addCustomDeck";
import arenaLogWatcher from "./arena-log-watcher";
import { ipcSend, unleakString } from "./backgroundUtil";
import { createDeck } from "./data";
import forceDeckUpdate from "./forceDeckUpdate";
import globals from "./globals";
import * as httpApi from "./httpApi";
import { loadPlayerConfig, syncSettings } from "./loadPlayerConfig";
import * as mtgaLog from "./mtgaLog";
import updateDeck from "./updateDeck";
import { reduxAction } from "../shared/redux/sharedRedux";
import initializeRendererReduxIPC from "../shared/redux/initializeRendererReduxIPC";
import { archive, getMatch, deckExists, getDeck } from "../shared/store";
import store, { AppState } from "../shared/redux/stores/backgroundStore";
import defaultLogUri from "../shared/utils/defaultLogUri";
import debugLog from "../shared/debugLog";
import { constants, InternalDeck } from "mtgatool-shared";

const { HIDDEN_PW, IPC_RENDERER, IPC_ALL, IPC_BACKGROUND } = constants;

initializeRendererReduxIPC(globals.store);

let oldState: AppState;

globals.store.subscribe(() => {
  const newState = globals.store.getState();
  if (!oldState) {
    oldState = newState;
    return;
  }
  // debugLog("Store updated");
  // Save settings only when they change
  const newSettings = newState.settings;
  if (!_.isEqual(oldState.settings, newSettings)) {
    //debugLog(".settings updated");
    playerDb.upsert("", "settings", newSettings);
  }

  // App settings
  const newAppSettings = { ...newState.appsettings };
  if (!_.isEqual(oldState.appsettings, newAppSettings)) {
    newAppSettings.toolVersion = globals.toolVersion;
    //debugLog(".appsettings updated");
    if (!newAppSettings.rememberMe) {
      appDb.upsert("", "settings", { ...newAppSettings, email: "", token: "" });
    } else {
      appDb.upsert("", "settings", newAppSettings);
    }
  }

  // Deck tags
  const newDeckTags = newState.playerdata.deckTags;
  if (!_.isEqual(oldState.playerdata.deckTags, newDeckTags)) {
    //debugLog(".deck_tags updated");
    playerDb.upsert("", "deck_tags", newDeckTags);
  }

  // Tags colors
  const newColors = newState.playerdata.tagsColors;
  if (!_.isEqual(oldState.playerdata.tagsColors, newColors)) {
    //debugLog(".tags_colors updated");
    playerDb.upsert("", "tags_colors", newColors);
  }

  // Private Decks
  const privateDecks = newState.decks.privateDecks;
  if (!_.isEqual(oldState.decks.privateDecks, privateDecks)) {
    playerDb.upsert("", "private_decks", privateDecks);
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
ipc.on("sync_check", async function () {
  httpApi.httpSyncPush();
});

//
ipc.on("start_background", async function () {
  appDb.init("application");
  reduxAction(
    globals.store.dispatch,
    { type: "SET_APPDB", arg: appDb.filePath },
    IPC_RENDERER
  );

  const appSettings =
    (await appDb.find("", "settings")) || globals.store.getState().appsettings;
  let logUri = (appSettings && appSettings.logUri) || undefined;

  if (typeof process.env.LOGFILE !== "undefined") {
    logUri = process.env.LOGFILE;
  }
  if (!logUri || logUri == "") {
    logUri = defaultLogUri();
  }
  debugLog("logUri: " + logUri);

  ipcSend("initialize_main", appSettings.launchToTray);
  reduxAction(
    globals.store.dispatch,
    { type: "SET_APP_SETTINGS", arg: { ...appSettings, ...logUri } },
    IPC_ALL ^ IPC_BACKGROUND
  );

  // Prefill auth form
  const { rememberMe, email, token } = appSettings;
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
    rememberMe,
  });

  // start initial log parse
  logLoopInterval = window.setInterval(attemptLogLoop, 250);

  // start http
  httpApi.initHttpQueue();
  //httpApi.httpGetDatabaseVersion(appSettings.metadataLang);
  ipcSend("ipc_log", `Downloading metadata ${appSettings.metadataLang}`);
});

function offlineLogin(): void {
  ipcSend("auth", { ok: true, user: -1 });
  loadPlayerConfig();
  debugLog("offlineLogin", "debug");
  /*
  reduxAction(
    globals.store.dispatch,
    { type: "SET_APP_SETTINGS", arg: { email: "" } },
    IPC_ALL ^ IPC_BACKGROUND
  );
  */
  reduxAction(
    globals.store.dispatch,
    { type: "SET_OFFLINE", arg: true },
    IPC_RENDERER
  );
}

//
ipc.on("login", function (_event, arg) {
  ipcSend("begin_login", {});
  debugLog(`IPC login: ${JSON.stringify(arg)}`, "debug");
  if (arg.username === "" && arg.password === "") {
    offlineLogin();
  } else {
    httpApi.httpAuth(arg.username, arg.password);
  }
});

//
ipc.on("admin_update_explore", function (_event, arg) {
  httpApi.httpAdminUpdateExplore(arg);
});

//
ipc.on("request_draft_link", function (_event, obj) {
  httpApi.httpDraftShareLink(obj.id, obj.data, obj.expire);
});

//
ipc.on("request_match_link", function (_event, obj) {
  httpApi.httpMatchShareLink(obj.id, obj.data, obj.expire);
});

//
ipc.on("request_deck_link", function (_event, obj) {
  httpApi.httpDeckShareLink(obj.id, obj.data, obj.expire);
});

//
ipc.on("windowBounds", (_event, windowBounds) => {
  if (globals.firstPass) return;
  playerDb.upsert("", "windowBounds", windowBounds);
});

//
ipc.on("overlayBounds", (_event, index, bounds) => {
  const overlays = [...globals.store.getState().settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    bounds, // new bounds
  };
  overlays[index] = newOverlay;
  playerDb.upsert("settings", "overlays", overlays);
});

//
ipc.on("save_overlay_settings", function (_event, settings) {
  // debugLog("save_overlay_settings");
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
ipc.on("delete_data", function () {
  httpApi.httpDeleteData();
});

//
ipc.on("import_custom_deck", function (_event, arg) {
  const data = JSON.parse(arg);
  const id = data.id;
  if (!id || deckExists(id)) return;
  const deckData: InternalDeck = {
    ...createDeck(),
    ...data,
  };
  addCustomDeck(deckData);
});

//
ipc.on("toggle_deck_archived", function (_event, arg) {
  const id = arg;
  const deck = getDeck(id);
  if (!deck) return;
  const deckData: InternalDeck = { ...deck, archived: !deck.archived };

  reduxAction(
    globals.store.dispatch,
    { type: "SET_DECK", arg: deckData },
    IPC_RENDERER
  );
  playerDb.upsert("decks", id, deckData);
});

//
ipc.on("toggle_archived", function (_event, id) {
  const data = archive(id);
  if (data) {
    playerDb.upsert("", id, data);
  }
});

ipc.on("request_explore", function (_event, arg) {
  if (globals.store.getState().appsettings.email === "") {
    reduxAction(
      globals.store.dispatch,
      { type: "SET_OFFLINE", arg: true },
      IPC_RENDERER
    );
  } else {
    httpApi.httpGetExplore(arg);
  }
});

ipc.on("request_cards", function (_event, arg) {
  if (globals.store.getState().appsettings.email === "") {
    reduxAction(
      globals.store.dispatch,
      { type: "SET_OFFLINE", arg: true },
      IPC_RENDERER
    );
  } else {
    httpApi.httpGetCards(arg);
  }
});

ipc.on("request_course", function (_event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", (_event, set) => {
  if (globals.store.getState().appsettings.email === "") {
    reduxAction(
      globals.store.dispatch,
      { type: "SET_OFFLINE", arg: true },
      IPC_RENDERER
    );
  } else {
    httpApi.httpHomeGet(set);
  }
});

ipc.on("edit_tag", (_event, arg) => {
  const { tag, color } = arg;
  const tags = {
    ...globals.store.getState().playerdata.tagsColors,
    [tag]: color,
  };
  playerDb.upsert("", "tags_colors", tags);
  reduxAction(
    globals.store.dispatch,
    { type: "EDIT_TAG_COLOR", arg: arg },
    IPC_RENDERER
  );
  //sendSettings();
});

ipc.on("delete_matches_tag", (_event, arg) => {
  const { matchid, tag } = arg;
  const match = getMatch(matchid);
  if (!match || !tag) return;
  if (!match.tags || !match.tags.includes(tag)) return;

  const tags = [...match.tags];
  tags.splice(tags.indexOf(tag), 1);
  const matchData = { ...match, tags };

  reduxAction(
    globals.store.dispatch,
    { type: "SET_MATCH", arg: matchData },
    IPC_RENDERER
  );
  playerDb.upsert(matchid, "tags", tags);
});

ipc.on("add_matches_tag", (_event, arg) => {
  const { matchid, tag } = arg;
  const match = getMatch(matchid);
  if (!match || !tag) return;
  if (match.tags && match.tags.includes(tag)) return;

  const tags = [...(match.tags || []), tag];
  const matchData = { ...match, tags };

  reduxAction(
    globals.store.dispatch,
    { type: "SET_MATCH", arg: matchData },
    IPC_RENDERER
  );
  playerDb.upsert(matchid, "tags", tags);
});

ipc.on("set_odds_samplesize", function (_event, state) {
  globals.oddsSampleSize = state;
  forceDeckUpdate(false);
  updateDeck(true);
});

// Set a new log URI
ipc.on("set_log", function (_event, arg) {
  if (globals.watchingLog) {
    globals.stopWatchingLog();
    globals.stopWatchingLog = arenaLogWatcher.startWatchingLog(arg);
  }
  const newAppSettings = { ...store.getState().appsettings, logUri: arg };
  appDb.upsert("", "settings", newAppSettings).then(() => {
    remote.app.relaunch();
    remote.app.exit(0);
  });
});

// Read the log
// Set variables to default first
let prevLogSize = 0;
let logLoops = -1;
let noPlayerData = false;

// Old parser
async function attemptLogLoop(): Promise<void> {
  try {
    await logLoop();
  } catch (err) {
    // eslint-disable-next-line no-console
    debugLog(err, "error");
  }
}

// Basic logic for reading the log file
async function logLoop(): Promise<void> {
  logLoops++;
  const logUri = globals.store.getState().appsettings.logUri;
  if (logLoops == 0) {
    debugLog("logLoop() start " + logUri);
  }
  if (logUri.indexOf("output_log") !== -1 && fs.existsSync(defaultLogUri())) {
    ipcSend("no_log", defaultLogUri());
    ipcSend("popup", {
      text: "Log file name has changed.",
      time: 1000,
    });
    if (logLoops == 0) {
      debugLog("Log file name has changed.");
    }
    return;
  }
  if (fs.existsSync(logUri)) {
    if (fs.lstatSync(logUri).isDirectory()) {
      ipcSend("no_log", logUri);
      ipcSend("popup", {
        text: "No log file found. Please include the file name too.",
        time: 1000,
      });
      if (logLoops == 0) {
        debugLog("No log file found. Please include the file name too.");
      }
      return;
    }
  } else {
    ipcSend("no_log", logUri);
    ipcSend("popup", { text: "No log file found.", time: 1000 });
    if (logLoops == 0) {
      debugLog("No log file found.");
    }
    return;
  }

  if (!globals.firstPass) {
    ipcSend("log_read", 1);
  }

  const { size } = await mtgaLog.stat(logUri);

  if (size == undefined) {
    // Something went wrong obtaining the file size, try again later
    debugLog("LogLoop(): Size undefined");
    return;
  }

  const delta = Math.min(268435440, size - prevLogSize);
  if (delta === 0) {
    // The log has not changed since we last checked
    if (noPlayerData) {
      ipcSend("popup", {
        text: "Player.log contains no player data.",
        time: 1000,
      });
    }
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
    playerName: undefined,
  };

  let detailedLogs = true;
  for (let i = 0; i < splitString.length; i++) {
    const value: string | undefined = splitString[i];
    // Check if detailed logs / plugin support is disabled
    let strCheck = "DETAILED LOGS: DISABLED";
    if (value?.includes(strCheck)) {
      debugLog("LogLoop(): Detailed logs disabled!");
      reduxAction(
        globals.store.dispatch,
        { type: "SET_CAN_LOGIN", arg: false },
        IPC_RENDERER
      );
      ipcSend("detailed_logs");
      detailedLogs = false;
    }

    // Get player Id
    strCheck = "AccountID:";
    if (value?.includes(strCheck) && parsedData.arenaId == undefined) {
      parsedData.arenaId =
        debugArenaID ?? unleakString(dataChop(value, strCheck, ","));
    }

    // Get User name
    strCheck = "DisplayName:";
    if (value?.includes(strCheck) && parsedData.playerName == undefined) {
      parsedData.playerName = unleakString(dataChop(value, strCheck, ","));
    }
    i++;
  }

  if (!detailedLogs) return;

  for (const key in parsedData) {
    const str = `Initial log parse: ${key}=${parsedData[key]}`;
    debugLog(str);
    ipcSend("ipc_log", str);
  }

  prevLogSize = size;
  const { arenaId, playerName } = parsedData;
  if (!arenaId || !playerName) {
    debugLog("Player.log contains no player data");
    noPlayerData = true;
    reduxAction(
      globals.store.dispatch,
      { type: "SET_CAN_LOGIN", arg: false },
      IPC_RENDERER
    );
    return;
  } else {
    reduxAction(
      globals.store.dispatch,
      { type: "SET_PLAYER_ID", arg: arenaId },
      IPC_RENDERER
    );
    reduxAction(
      globals.store.dispatch,
      { type: "SET_PLAYER_NAME", arg: playerName },
      IPC_RENDERER
    );
    noPlayerData = false;
  }

  ipcSend("popup", {
    text: "Found Arena log for " + playerName,
    time: 0,
  });
  clearInterval(logLoopInterval);

  // If we got this far, we have a username in the logs so we can log in properly
  // Send the message to enable the login button
  const {
    autoLogin,
    rememberMe,
    email,
    token,
  } = globals.store.getState().appsettings;
  let username = "";
  if (rememberMe) {
    username = email;
  }
  reduxAction(
    globals.store.dispatch,
    { type: "SET_CAN_LOGIN", arg: true },
    IPC_RENDERER
  );

  httpApi.httpGetActiveEvents();
  // Begin auto login too, if enabled
  if (autoLogin) {
    debugLog("automatic login process started..");
    ipcSend("toggle_login", false);
    if (rememberMe && username && token) {
      ipcSend("popup", {
        text: "Logging in automatically...",
        time: 0,
        progress: 2,
      });
      httpApi.httpAuth(username, HIDDEN_PW);
    } else {
      ipcSend("popup", {
        text: "Launching offline mode automatically...",
        time: 0,
        progress: 2,
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

module.exports = {};

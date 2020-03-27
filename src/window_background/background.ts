/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
import { app, ipcRenderer as ipc, remote } from "electron";
import fs from "fs";
import _ from "lodash";
import path from "path";
import { HIDDEN_PW } from "../shared/constants";
import { rememberDefaults } from "../shared/db/databaseUtil";
import { appDb, playerDb } from "../shared/db/LocalDatabase";
import playerData from "../shared/PlayerData";
import { getReadableFormat } from "../shared/util";
import { InternalDeck } from "../types/Deck";
import addCustomDeck from "./addCustomDeck";
import arenaLogWatcher from "./arena-log-watcher";
import { ipcSend, setData, unleakString } from "./backgroundUtil";
import { createDeck } from "./data";
import forceDeckUpdate from "./forceDeckUpdate";
import globals from "./globals";
import * as httpApi from "./httpApi";
import {
  backportNeDbToElectronStore,
  loadPlayerConfig,
  syncSettings
} from "./loadPlayerConfig";
import * as mtgaLog from "./mtgaLog";
import updateDeck from "./updateDeck";

if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: (error: any) => {
      openNewGitHubIssue({
        user: "Manuel-777",
        repo: "MTG-Arena-Tool",
        body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
      });
    }
  });
  const Sentry = require("@sentry/electron");
  Sentry.init({
    dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
  });
}

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

//
ipc.on("save_app_settings", function(event, arg) {
  appDb.find("", "settings").then(appSettings => {
    appSettings.toolVersion = globals.toolVersion;
    const updated = { ...appSettings, ...arg };
    if (!updated.remember_me) {
      appDb.upsert("", "email", "");
      appDb.upsert("", "token", "");
    }
    appDb.upsert("", "settings", updated);
    syncSettings(updated);
  });
});

//
ipc.on("save_app_settings_norefresh", function(event, arg) {
  appDb.find("", "settings").then(appSettings => {
    appSettings.toolVersion = globals.toolVersion;
    const updated = { ...appSettings, ...arg };
    if (!updated.remember_me) {
      appDb.upsert("", "email", "");
      appDb.upsert("", "token", "");
    }
    appDb.upsert("", "settings", updated);
    syncSettings(updated, false);
  });
});

function fixBadSettingsData(): void {
  appDb.find("", "settings").then(appSettings => {
    // First introduced in 2.8.4 (2019-07-25)
    // Some people's date formats are set to "undefined"
    // These should be an empty string.
    if (appSettings.log_locale_format === "undefined") {
      appSettings.log_locale_format = "";
    }

    // Define new metadata language setting.
    if (appSettings.metadata_lang === undefined) {
      appSettings.metadata_lang = "en";
    }
    // include more fixes below. Be as specific
    // and conservitive as possible.

    appDb.upsert("", "settings", appSettings);
  });
}

ipc.on("download_metadata", () => {
  appDb.find("", "settings").then(appSettings => {
    httpApi.httpGetDatabaseVersion(appSettings.metadata_lang);
  });
});

ipc.on("backport_all_data", backportNeDbToElectronStore);

//
ipc.on("start_background", async function() {
  appDb.init("application"); // TODO is this redundant with init call in main?
  setData({ appDbPath: appDb.filePath }, false);
  fixBadSettingsData();

  let logUri = await appDb.find("", "logUri");
  if (typeof process.env.LOGFILE !== "undefined") {
    logUri = process.env.LOGFILE;
  }
  if (!logUri) {
    logUri = mtgaLog.defaultLogUri();
  }
  const email = await appDb.find("", "email");
  const token = await appDb.find("", "token");
  const appSettings = await appDb.find("", "settings");
  const settings = _.defaultsDeep(
    {
      ...appSettings,
      logUri,
      email,
      token
    },
    rememberDefaults.settings
  );
  syncSettings(settings, false);
  ipcSend("initial_settings", settings);

  // start initial log parse
  logLoopInterval = window.setInterval(attemptLogLoop, 250);

  // start http
  httpApi.initHttpQueue();
  httpApi.httpGetDatabaseVersion(settings.metadata_lang);
  ipcSend("ipc_log", `Downloading metadata ${settings.metadata_lang}`);
});

function offlineLogin(): void {
  ipcSend("auth", { ok: true, user: -1 });
  loadPlayerConfig(playerData.arenaId);
  setData({ userName: "", offline: true });
}

//
ipc.on("login", function(event, arg) {
  ipcSend("begin_login", {});
  if (arg.password == HIDDEN_PW) {
    httpApi.httpAuth(arg.username, arg.password);
  } else if (arg.username === "" && arg.password === "") {
    offlineLogin();
  } else {
    syncSettings({ token: "" }, false);
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
  const overlays = [...playerData.settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    bounds // new bounds
  };
  overlays[index] = newOverlay;
  setData({ settings: { ...playerData.settings, overlays } }, false);
  playerDb.upsert("settings", "overlays", overlays);
});

//
ipc.on("save_overlay_settings", function(event, settings) {
  // console.log("save_overlay_settings");
  if (settings.index === undefined) return;

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
  playerDb.upsert("settings", "overlays", overlays);
  syncSettings(updated);
});

//
ipc.on("save_user_settings", function(event, settings) {
  // console.log("save_user_settings");
  let refresh = true;
  if (settings.skipRefresh) {
    delete settings.skipRefresh;
    refresh = false;
  }
  syncSettings(settings, refresh);
  playerDb.upsert("", "settings", playerData.data.settings);
});

//
ipc.on("delete_data", function() {
  httpApi.httpDeleteData();
});

//
ipc.on("import_custom_deck", function(event, arg) {
  const data = JSON.parse(arg);
  const id = data.id;
  if (!id || playerData.deckExists(id)) return;
  const deckData = {
    ...createDeck(),
    ...data
  };
  addCustomDeck(deckData);
});

//
ipc.on("toggle_deck_archived", function(event, arg) {
  const id = arg;
  const deck = playerData.deck(id);
  if (!deck) return;
  const deckData: InternalDeck = { ...deck };
  deckData.archived = !deckData.archived;
  const decks = { ...playerData.decks, [id]: deckData };

  setData({ decks });
  playerDb.upsert("decks", id, deckData);
});

//
ipc.on("toggle_archived", function(event, arg) {
  const id = arg;
  const item = (playerData as Record<string, any>)[id];
  if (!item) return;
  const data = { ...item };
  data.archived = !data.archived;

  setData({ [id]: data });
  playerDb.upsert("", id, data);
});

ipc.on("request_explore", function(event, arg) {
  if (playerData.userName === "") {
    ipcSend("offline", 1);
  } else {
    httpApi.httpGetExplore(arg);
  }
});

ipc.on("request_course", function(event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", (event, set) => {
  if (playerData.userName === "") {
    ipcSend("offline", 1);
  } else {
    httpApi.httpHomeGet(set);
  }
});

ipc.on("edit_tag", (event, arg) => {
  const { tag, color } = arg;
  const tags_colors = { ...playerData.tags_colors, [tag]: color };
  setData({ tags_colors });
  playerDb.upsert("", "tags_colors", tags_colors);
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
  playerDb.upsert("", "decks_tags", decks_tags);
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
  playerDb.upsert("", "decks_tags", decks_tags);
});

ipc.on("delete_matches_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = playerData.match(matchid);
  if (!match || !tag) return;
  if (!match.tags || !match.tags.includes(tag)) return;

  const tags = [...match.tags];
  tags.splice(tags.indexOf(tag), 1);

  const matchData = { ...match, tags };

  setData({ [matchid]: matchData });
  playerDb.upsert(matchid, "tags", tags);
});

ipc.on("add_matches_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = playerData.match(matchid);
  if (!match || !tag) return;
  if (match.tags && match.tags.includes(tag)) return;

  const tags = [...(match.tags || []), tag];

  setData({ [matchid]: { ...match, tags } });
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
  syncSettings({ logUri: arg });
  appDb.upsert("", "logUri", arg).then(() => {
    remote.app.relaunch();
    remote.app.exit(0);
  });
});

// Read the log
// Set variables to default first
let prevLogSize = 0;

function sendSettings(): void {
  const tags_colors = playerData.tags_colors;
  const settingsData = { tags_colors };
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
  const logUri = playerData.settings.logUri;
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
  /*
  if (globals.debugLog) {
    globals.firstPass = false;
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
  const splitString = rawString.split("[UnityCrossThread");
  const parsedData: Record<string, string> = {};

  let detailedLogs = true;
  splitString.forEach(value => {
    //ipcSend("ipc_log", "Async: ("+index+")");

    // Check if logs are disabled
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
    if (value.includes(strCheck) && parsedData.name == undefined) {
      parsedData.name = unleakString(dataChop(value, strCheck, '\\"'));
    }

    // Get Client Version
    strCheck = '\\"clientVersion\\": "\\';
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
  setData(parsedData, false);

  prevLogSize = size;

  if (!playerData.arenaId || !playerData.name) {
    ipcSend("popup", {
      text: "output_log.txt contains no player data",
      time: 0
    });
    return;
  }

  ipcSend("popup", {
    text: "Found Arena log for " + playerData.name,
    time: 0
  });
  clearInterval(logLoopInterval);

  const { auto_login, remember_me, email, token } = playerData.settings;
  let username = "";
  let password = "";
  if (remember_me) {
    username = email;
    if (email && token) {
      password = HIDDEN_PW;
    }
  }

  ipcSend("prefill_auth_form", {
    username,
    password,
    remember_me
  });

  if (auto_login) {
    ipcSend("toggle_login", false);
    if (remember_me && username && token) {
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

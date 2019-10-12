const electron = require("electron");
const playerData = require("common/player-data");
const Store = require("electron-store");
const Deck = require("common/deck");
const path = require("path");
const fs = require("fs");

// Hey! If you're here, you might be thinking of adding stuff to this file.
// Don't. This is a shadowy place. You must never go here.
// Hopefully we'll be able to get rid of all of the ones that can change,
// and put them into stores or better structures than a giant export list.

const actionLogDir = path.join(
  (electron.app || electron.remote.app).getPath("userData"),
  "actionlogs"
);
if (!fs.existsSync(actionLogDir)) {
  fs.mkdirSync(actionLogDir);
}

const mtgaLog = require("./mtga-log");
let logUri = mtgaLog.defaultLogUri();

var currentDeck = new Deck();

var currentMatch = null;

const debugLog = false;

const debugNet = true;

let duringDraft = false;

var duringMatch = false;

var firstPass = true;

var gameNumberCompleted = 0;

let idChanges = {};

let initialLibraryInstanceIds = [];

let instanceToCardIdMap = {};

let logReadStart = null;

let logTime = false;

var matchCompletedOnGameNumber = 0;

var matchGameStats = [];

var originalDeck = null;

let odds_sample_size = 1;

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

var rStore = new Store({
  name: "remember",
  defaults: rememberCfg
});

var store = new Store({
  name: "default",
  defaults: playerData.defaultCfg
});

var tokenAuth = undefined;

let watchingLog = false;

let stopWatchingLog;

module.exports = {
  actionLogDir,
  currentDeck,
  currentMatch,
  debugLog,
  debugNet,
  duringDraft,
  duringMatch,
  firstPass,
  gameNumberCompleted,
  idChanges,
  initialLibraryInstanceIds,
  instanceToCardIdMap,
  logReadStart,
  logTime,
  logUri,
  matchCompletedOnGameNumber,
  matchGameStats,
  mtgaLog,
  odds_sample_size,
  originalDeck,
  rStore,
  stopWatchingLog,
  store,
  tokenAuth,
  toolVersion,
  watchingLog
};

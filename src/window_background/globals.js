const electron = require("electron");
const playerData = require("../shared/player-data");
const Store = require("electron-store");
const Deck = require("../shared/deck");
const path = require("path");

const actionLogDir = path.join(
  (electron.app || electron.remote.app).getPath("userData"),
  "actionlogs"
);
if (!fs.existsSync(actionLogDir)) {
  fs.mkdirSync(actionLogDir);
}

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

let logTime = false;

var matchCompletedOnGameNumber = 0;

var matchGameStats = [];

var originalDeck = null;

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
  logTime,
  matchCompletedOnGameNumber,
  matchGameStats,
  originalDeck,
  rStore,
  store,
  tokenAuth,
  toolVersion
};

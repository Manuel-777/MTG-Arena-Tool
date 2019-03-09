/*
global
  cardsDb,
  stripTags,
  windowBackground,
  windowRenderer,
  windowOverlay,
  get_rank_index,
  playerDataDefault,
  hypergeometric,
  onLabelOutLogInfo,
  onLabelGreToClient,
  eventsToFormat,
  compare_archetypes,
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelInEventGetPlayerCourse,
  onLabelInEventGetCombinedRankInfo,
  onLabelInDeckGetDeckLists,
  onLabelInEventGetPlayerCourses,
  onLabelInDeckUpdateDeck,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInEventDeckSubmit,
  onLabelEventMatchCreated,
  onLabelOutDirectGameChallenge,
  onLabelInDraftDraftStatus,
  onLabelInDraftMakePick,
  onLabelOutDraftMakePick,
  onLabelInEventCompleteDraft,
  onLabelMatchGameRoomStateChangedEvent,
  onLabelInEventGetSeasonAndRankDetail,
  onLabelGetPlayerInventoryGetRewardSchedule
*/
var electron = require("electron");

const { app, net, clipboard } = require("electron");

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

const path = require("path");
const Store = require("../store.js");
const fs = require("fs");
const sha1 = require("js-sha1");
const ipc = electron.ipcRenderer;

const transform = require("lodash.transform");
const cloneDeep = require("lodash.clonedeep");

const httpApi = require("./http-api");

const rememberCfg = {
  email: "",
  token: ""
};

const settingsCfg = {
  gUri: ""
};

const defaultCfg = {
  windowBounds: { width: 800, height: 600, x: 0, y: 0 },
  overlayBounds: { width: 300, height: 600, x: 0, y: 0 },
  cards: { cards_time: 0, cards_before: [], cards: [] },
  settings: {
    overlay_sideboard: false,
    sound_priority: false,
    sound_priority_volume: 1,
    cards_quality: "small",
    show_overlay: true,
    show_overlay_always: false,
    startup: true,
    close_to_tray: true,
    send_data: true,
    anon_explore: false,
    close_on_match: true,
    cards_size: 2,
    overlay_alpha: 1,
    overlay_alpha_back: 1,
    overlay_scale: 100,
    overlay_top: true,
    overlay_title: true,
    overlay_deck: true,
    overlay_clock: true,
    overlay_ontop: true,
    export_format: "$Name,$Count,$Rarity,$SetName,$Collector",
    back_color: "rgba(0,0,0,0.3)",
    back_url: ""
  },
  economy_index: [],
  economy: [],
  deck_changes: {},
  deck_changes_index: [],
  courses_index: [],
  matches_index: [],
  draft_index: [],
  gems_history: [],
  gold_history: [],
  decks_index: [],
  decks_tags: {},
  tags_colors: {},
  decks: {},
  wildcards_history: []
};

var rstore = new Store({
  configName: "remember",
  defaults: rememberCfg
});

var store = new Store({
  configName: "default",
  defaults: defaultCfg
});

var settingsStore = new Store({
  configName: "settings",
  defaults: settingsCfg
});

const debugLog = false;
const debugNet = true;
var debugLogSpeed = 0.1;

const actionLogDir = path.join(
  (electron.app || electron.remote.app).getPath("userData"),
  "actionlogs"
);
if (!fs.existsSync(actionLogDir)) {
  fs.mkdirSync(actionLogDir);
}

var firstPass = true;
var tokenAuth = undefined;

var currentMatchDefault = {
  eventId: "",
  matchId: "",
  beginTime: 0,
  matchTime: 0,
  currentPriority: 0,
  bestOf: 1,
  game: 0,
  priorityTimers: [0, 0, 0, 0, 0],
  lastPriorityChangeTime: 0,
  results: [],
  zones: {},
  gameObjs: {},
  turn: {},
  playerCards: {},
  oppCards: {},
  player: {
    seat: 1,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1
  },
  opponent: {
    seat: 2,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1
  }
};

var currentDraftDefault = {
  eventId: "",
  draftId: "",
  set: "",
  owner: ""
};

var currentDraft = null;
/*
var currentDraft = undefined;
var currentDraftPack = undefined;
var draftSet = "";
var draftId = undefined;
*/

var playerData = cloneDeep(playerDataDefault);
var currentMatch = null;

var renderer_state = 0;
var originalDeck = {};

var currentDeck = null;
var duringMatch = false;
var matchBeginTime = 0;
var matchGameStats = [];
var matchCompletedOnGameNumber = 0;
var gameNumberCompleted = 0;

var gameStage = "";
var initialLibraryInstanceIds = [];
var idChanges = {};
var instanceToCardIdMap = {};

var history = {};
var drafts = {};
var events = {};
var economy = {};
var staticDecks = [];

var decks = {};
var deck_changes_index = [];
var deck_changes = {};
var decks_tags = {};
var tags_colors = {};
var deck_archetypes = {};

var gold = 0;
var gems = 0;
var vault = 0;
var wcTrack = 0;
var wcCommon = 0;
var wcUncommon = 0;
var wcRare = 0;
var wcMythic = 0;

var overlayDeckMode = 0;
var lastDeckUpdate = new Date();

let formats = {
  Standard: "Standard",
  TraditionalStandard: "Traditional Standard",
  Pauper: "Pauper",
  Singleton: "Singleton",
  NoInstants: "No Instants",
  Ravnica: "Ravnica Constructed",
  XLN: "Ixalan Constructed",
  Pandemonium: "Pandemonium"
};

// Begin of IPC messages recievers
function ipc_send(method, arg, to = windowRenderer) {
  if (method == "ipc_log") {
    //
  }
  //console.log("IPC SEND", method, arg, to);
  ipc.send("ipc_switch", method, windowBackground, arg, to);
}

var rememberMe = false;

//
ipc.on("remember", function(event, arg) {
  rememberMe = arg;
  if (!arg) {
    rstore.set("email", "");
    rstore.set("token", "");
  }
});

function loadSettings() {
  var settings = store.get("settings");
  updateSettings(settings, true);
}

ipc.on("reload_overlay", function() {
  loadSettings();
  var obj = store.get("overlayBounds");
  ipc_send("overlay_set_bounds", obj);
});

//
ipc.on("set_renderer_state", function(event, arg) {
  ipc_send("ipc_log", "Renderer state: " + arg);
  renderer_state = arg;
  loadSettings();

  if (rstore.get("token") !== "" && rstore.get("email") !== "") {
    rememberMe = true;
    tokenAuth = rstore.get("token");
    ipc_send("set_remember", rstore.get("email"));
  }
});

//
ipc.on("login", function(event, arg) {
  if (arg.password == "********") {
    tokenAuth = rstore.get("token");
    playerData.userName = arg.username;
    httpApi.httpAuth(arg.username, arg.password);
  } else if (arg.username == "" && arg.password == "") {
    ipc_send("auth", { ok: true, user: -1 });
    loadPlayerConfig(playerData.arenaId);
    playerData.userName = "";
  } else {
    playerData.userName = arg.username;
    tokenAuth = "";
    httpApi.httpAuth(arg.username, arg.password);
  }
});

//
ipc.on("request_draft_link", function(event, obj) {
  httpApi.httpDraftShareLink(obj.id, obj.expire);
});

//
ipc.on("windowBounds", function(event, obj) {
  store.set("windowBounds", obj);
});

//
ipc.on("overlayBounds", function(event, obj) {
  store.set("overlayBounds", obj);
});

//
ipc.on("save_settings", function(event, settings) {
  store.set("settings", settings);
  updateSettings(settings, false);
});

//
ipc.on("delete_data", function() {
  httpApi.httpDeleteData();
});

//
ipc.on("delete_course", function(event, arg) {
  var i = events.courses.indexOf(arg);
  if (i > -1) {
    events.courses.splice(i, 1);
    store.set("courses_index", events.courses);
    store.delete(arg);
  }
  //console.log("Delete ", arg);
});

//
ipc.on("delete_deck", function(event, arg) {
  var i = decks.index.indexOf(arg);
  if (i > -1) {
    decks.index.splice(i, 1);
    delete decks[arg];
    store.set("decks_index", decks.index);
    store.delete("decks." + arg);
  }
  // If we do it imediately it looks awful
  setTimeout(() => {
    ipc_send("set_decks", JSON.stringify(decks));
  }, 200);
});

//
ipc.on("delete_match", function(event, arg) {
  var i = history.matches.indexOf(arg);
  if (i > -1) {
    history.matches.splice(i, 1);
    store.set("matches_index", history.matches);
    store.delete(arg);
  }
  i = drafts.matches.indexOf(arg);
  if (i > -1) {
    drafts.matches.splice(i, 1);
    store.set("draft_index", drafts.matches);
    store.delete(arg);
  }
});

//
ipc.on("request_events", () => {
  ipc_send("set_events", JSON.stringify(events));
});

//
ipc.on("request_history", (event, state) => {
  requestHistorySend(state);
});

//
ipc.on("set_deck_archetypes", (event, arg) => {
  deck_archetypes = arg;
});

window.onerror = (msg, url, line, col, err) => {
  var error = {
    msg: err.msg,
    stack: err.stack,
    line: line,
    col: col
  };
  error.id = sha1(error.msg + playerData.arenaId);
  httpApi.httpSendError(error);
  ipc_send("ipc_log", "Background Error:" + error);
};

process.on("uncaughtException", function(err) {
  var error = {
    msg: err,
    stack: "uncaughtException",
    line: 0,
    col: 0
  };
  console.log("ERROR: ", error);
  error.id = sha1(error.msg + playerData.arenaId);
  httpApi.httpSendError(error);
  ipc_send("ipc_log", `Background ${error.stack}: ${error.join(" - ")}`);
});

//
ipc.on("error", function(event, err) {
  err.id = sha1(err.msg + playerData.arenaId);
  httpApi.httpSendError(err);
  ipc_send("ipc_log", "Background error:" + err);
});

//
function requestHistorySend(state) {
  if (history.matches != undefined) {
    calculateRankWins(history);
  }
  if (state == 1) {
    // Send the data and open history tab
    ipc_send("background_set_history", JSON.stringify(history));
  } else {
    /// Send only the data
    ipc_send("background_set_history_data", JSON.stringify(history));
  }
}

var ranked_events = ["QuickDraft_M19_20190118"];

var season_starts = new Date("2019-01-31T17:05:00Z");
var season_ends = null;

// Calculates winrates for history tabs (set to last 10 dys as default)
function calculateRankWins() {
  var rankwinrates = {
    constructed: {
      bronze: { w: 0, l: 0, t: 0, r: "Bronze" },
      silver: { w: 0, l: 0, t: 0, r: "Silver" },
      gold: { w: 0, l: 0, t: 0, r: "Gold" },
      platinum: { w: 0, l: 0, t: 0, r: "Platinum" },
      diamond: { w: 0, l: 0, t: 0, r: "Diamond" },
      mythic: { w: 0, l: 0, t: 0, r: "Mythic" },
      step: playerData.rank.constructed.step,
      steps: playerData.rank.constructed.steps,
      total: {
        w: playerData.rank.constructed.won,
        l: playerData.rank.constructed.lost,
        t: playerData.rank.constructed.won + playerData.rank.constructed.lost
      }
    },
    limited: {
      bronze: { w: 0, l: 0, t: 0, r: "Bronze" },
      silver: { w: 0, l: 0, t: 0, r: "Silver" },
      gold: { w: 0, l: 0, t: 0, r: "Gold" },
      platinum: { w: 0, l: 0, t: 0, r: "Platinum" },
      diamond: { w: 0, l: 0, t: 0, r: "Diamond" },
      mythic: { w: 0, l: 0, t: 0, r: "Mythic" },
      step: playerData.rank.limited.step,
      steps: playerData.rank.limited.steps,
      total: {
        w: playerData.rank.limited.won,
        l: playerData.rank.limited.lost,
        t: playerData.rank.limited.won + playerData.rank.limited.lost
      }
    }
  };

  let ss = new Date(season_starts);
  let se = new Date(season_ends);

  for (var i = 0; i < history.matches.length; i++) {
    let match_id = history.matches[i];
    let match = history[match_id];

    if (match == undefined) continue;
    if (match.type !== "match") continue;
    if (match.opponent == undefined) continue;

    let md = new Date(match.date);

    if (md < ss) continue;
    if (md > se) continue;

    let struct;
    if (match.eventId == "Ladder" || match.eventId == "Traditional_Ladder") {
      struct = rankwinrates.constructed;
    } else if (ranked_events.includes(match.eventId)) {
      struct = rankwinrates.limited;
    } else {
      continue;
    }

    struct = struct[match.player.rank.toLowerCase()];

    if (struct) {
      struct.t += match.opponent.win + match.player.win;
      struct.l += match.opponent.win;
      struct.w += match.player.win;
    }
  }

  history.rankwinrates = rankwinrates;
}

ipc.on("request_explore", function(event, arg) {
  if (playerData.userName == "") {
    ipc_send("offline", 1);
  } else {
    let cards = store.get("cards.cards");
    if (arg == "all" || arg == "All") {
      httpApi.httpGetTopDecks("", cards);
    } else if (arg == "Ranked Ladder") {
      httpApi.httpGetTopLadderDecks();
    } else if (arg == "Traditional Ranked Ladder") {
      httpApi.httpGetTopLadderTraditionalDecks();
    } else {
      httpApi.httpGetTopDecks(arg, cards);
    }
  }
});

ipc.on("request_economy", function() {
  sendEconomy();
});

ipc.on("request_course", function(event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", function() {
  if (playerData.userName == "") {
    ipc_send("offline", 1);
  } else {
    httpApi.httpHomeGet();
  }
});

ipc.on("tou_get", function(event, arg) {
  httpApi.httpTournamentGet(arg);
});

ipc.on("tou_join", function(event, arg) {
  httpApi.httpTournamentJoin(arg.id, arg.deck);
});

ipc.on("tou_drop", function(event, arg) {
  httpApi.httpTournamentDrop(arg);
});

ipc.on("edit_tag", function(event, arg) {
  tags_colors[arg.tag] = arg.color;
  store.set("tags_colors", tags_colors);
});

ipc.on("delete_tag", function(event, arg) {
  if (decks_tags[arg.deck]) {
    decks_tags[arg.deck].forEach((tag, index) => {
      if (tag == arg.name) {
        decks_tags[arg.deck].splice(index, 1);
      }
    });
  }
  store.set("decks_tags", decks_tags);
});

ipc.on("add_tag", function(event, arg) {
  if (decks_tags[arg.deck]) {
    decks_tags[arg.deck].push(arg.name);
  } else {
    decks_tags[arg.deck] = [arg.name];
  }
  store.set("decks_tags", decks_tags);
});

ipc.on("delete_history_tag", function(event, arg) {
  let match = history[arg.match];

  if (match.tags) {
    match.tags.forEach((tag, index) => {
      if (tag == arg.name) {
        match.tags.splice(index, 1);
      }
    });
  }

  store.set(arg.match, match);
});

ipc.on("add_history_tag", function(event, arg) {
  let match = history[arg.match];

  if (match.tags) {
    match.tags.push(arg.name);
  } else {
    match.tags = [arg.name];
  }

  httpApi.httpSetDeckTag(arg.name, match.oppDeck.mainDeck, match.eventId);
  store.set(arg.match, match);
});

ipc.on("set_deck_mode", function(event, state) {
  overlayDeckMode = state;
  update_deck(true);
});

let odds_sample_size = 1;
ipc.on("set_odds_samplesize", function(event, state) {
  odds_sample_size = state;
  forceDeckUpdate(false);
  update_deck(true);
});

ipc.on("get_deck_changes", function(event, arg) {
  get_deck_changes(arg);
});

function sendEconomy() {
  var ec = economy;
  ec.gold = gold;
  ec.gems = gems;
  ec.vault = vault;
  ec.wcTrack = wcTrack;
  ec.wcCommon = wcCommon;
  ec.wcUncommon = wcUncommon;
  ec.wcRare = wcRare;
  ec.wcMythic = wcMythic;
  ipc_send("set_economy", JSON.stringify(ec));
}
/*
function rememberLogin(bool) {
  if (bool) {
    rstore.set("email", playerData.userName);
    rstore.set("token", tokenAuth);
  }
  else {
    rstore.set("email", "");
    rstore.set("token", "");
  }
}
*/

// Loads this player's configuration file
function loadPlayerConfig(playerId) {
  ipc_send("ipc_log", "Load player ID: " + playerId);
  store = new Store({
    configName: playerId,
    defaults: defaultCfg
  });

  // Preload config, if we use store.get turned out to be SLOOOW
  var entireConfig = store.get();
  var id, item;
  history.matches = entireConfig["matches_index"];

  for (let i = 0; i < history.matches.length; i++) {
    ipc_send("popup", {
      text: "Reading history: " + i + " / " + history.matches.length,
      time: 0
    });
    id = history.matches[i];
    if (id != null) {
      item = entireConfig[id];
      if (item != undefined) {
        history[id] = item;
        history[id].type = "match";
      }
    }
  }

  drafts.matches = store.get("draft_index");
  for (let i = 0; i < drafts.matches.length; i++) {
    ipc_send("popup", {
      text: "Reading drafts: " + i + " / " + drafts.matches.length,
      time: 0
    });
    id = drafts.matches[i];

    if (id != null) {
      item = entireConfig[id];
      if (item != undefined) {
        if (history.matches.indexOf(id) == -1) {
          history.matches.push(id);
        }
        history[id] = item;
        history[id].type = "draft";
      }
    }
  }

  events.courses = store.get("courses_index");
  for (let i = 0; i < events.courses.length; i++) {
    ipc_send("popup", {
      text: "Reading events: " + i + " / " + events.courses.length,
      time: 0
    });
    id = events.courses[i];

    if (id != null) {
      item = entireConfig[id];
      if (item != undefined) {
        events[id] = item;
        events[id].type = "Event";
      }
    }
  }

  economy.changes = store.get("economy_index");
  for (let i = 0; i < economy.changes.length; i++) {
    ipc_send("popup", {
      text: "Reading economy: " + i + " / " + economy.changes.length,
      time: 0
    });
    id = economy.changes[i];

    if (id != null) {
      item = entireConfig[id];
      if (item != undefined) {
        economy[id] = item;
      }
    }
  }

  decks.index = store.get("decks_index");
  for (let i = 0; i < decks.index.length; i++) {
    ipc_send("popup", {
      text: "Reading decks: " + i + " / " + decks.index.length,
      time: 0
    });
    id = decks.index[i];

    if (id != null) {
      let deck = entireConfig.decks[id];
      let tags = entireConfig.decks_tags[id];
      if (deck != undefined) {
        deck.tags = tags;
        decks[id] = deck;
      }
    }
  }

  // Remove duplicates, sorry :(
  let length = history.matches.length;
  history.matches = history.matches.sort().filter(function(item, pos, ary) {
    return !pos || item != ary[pos - 1];
  });
  if (length !== history.matches.length) {
    store.set("matches_index", history.matches);
  }

  deck_changes_index = entireConfig["deck_changes_index"];
  deck_changes = entireConfig["deck_changes"];
  decks_tags = entireConfig["decks_tags"];
  tags_colors = entireConfig["tags_colors"];

  var obj = store.get("overlayBounds");

  ipc_send("set_tags_colors", tags_colors);
  ipc_send("overlay_set_bounds", obj);

  ipc_send("set_cards", { cards: entireConfig.cards.cards, new: {} });

  sendEconomy();

  loadSettings();
  requestHistorySend(0);

  watchingLog = true;
  stopWatchingLog = startWatchingLog();
}

// Updates the settings variables , sends to overlay if 'relay' is set
function updateSettings(_settings, relay) {
  //console.log(_settings);
  //const exeName = path.basename(process.execPath);

  if (_settings.overlay_top == undefined) _settings.overlay_top = true;
  if (_settings.overlay_title == undefined) _settings.overlay_title = true;
  if (_settings.overlay_deck == undefined) _settings.overlay_deck = true;
  if (_settings.overlay_clock == undefined) _settings.overlay_clock = true;
  if (_settings.overlay_ontop == undefined) _settings.overlay_ontop = true;
  if (_settings.overlay_scale == undefined) _settings.overlay_scale = 100;
  if (_settings.skip_firstpass == undefined) _settings.skip_firstpass = false;
  if (_settings.sound_priority_volume == undefined)
    _settings.sound_priority_volume = 1;

  skipFirstPass = _settings.skip_firstpass;

  ipc_send("overlay_set_ontop", _settings.overlay_ontop);

  if (_settings.export_format == undefined) {
    _settings.export_format = "$Name,$Count,$Rarity,$SetName,$Collector";
  }

  if (_settings.show_overlay == false) {
    ipc_send("overlay_close", 1);
  } else if (duringMatch || _settings.show_overlay_always) {
    ipc_send("overlay_show", 1);
  }

  if (relay) {
    ipc_send("set_settings", _settings);
  }
}

//
function get_deck_changes(deckId) {
  // sends to renderer the selected deck's data
  var changes = [];
  deck_changes_index.forEach(function(changeId) {
    var change = deck_changes[changeId];
    if (change.deckId == deckId) {
      changes.push(change);
    }
  });

  ipc_send("set_deck_changes", JSON.stringify(changes));
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

let skipMatch = false;
let skipFirstPass = false;

function onLogEntryFound(entry) {
  if (debugLog) {
    let currentTime = new Date().getTime();
    while (currentTime + debugLogSpeed >= new Date().getTime()) {
      // sleep
    }
  }
  let json;
  if (entry.type == "connection") {
    playerData.arenaId = entry.socket.PlayerId;
    playerData.arenaVersion = entry.socket.ClientVersion;
    playerData.name = entry.socket.PlayerScreenName;
    ipc_send("set_player_data", playerData);
  } else {
    //console.log("Entry:", entry.label, entry, entry.json());
    if (firstPass) {
      updateLoading(entry);
    }
    if ((firstPass && !skipFirstPass) || !firstPass) {
      switch (entry.label) {
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
          onLabelClientToMatchServiceMessageTypeClientToGREMessage(entry, json);
          break;

        case "Event.GetPlayerCourse":
          if (entry.arrow == "<==") {
            json = entry.json();
            onLabelInEventGetPlayerCourse(entry, json);
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

        case "Event.GetPlayerCourses":
          if (entry.arrow == "<==") {
            json = entry.json();
            onLabelInEventGetPlayerCourses(entry, json);
          }
          break;

        case "Deck.GetDeckLists":
          if (entry.arrow == "<==") {
            json = entry.json();
            onLabelInDeckGetDeckLists(entry, json);
          }
          break;

        case "Deck.UpdateDeck":
          if (entry.arrow == "<==") {
            json = entry.json();
            onLabelInDeckUpdateDeck(entry, json);
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

        case "Event.DeckSubmit":
          if (entry.arrow == "<==") {
            json = entry.json();
            onLabelInEventDeckSubmit(entry, json);
          }
          break;

        case "Event.MatchCreated":
          json = entry.json();
          onLabelEventMatchCreated(entry, json);
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
    }
  }
}

// Old parser
let logLoopInterval = window.setInterval(attemptLogLoop, 250);
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
  if (!(await mtgaLog.exists(logUri))) {
    ipc_send("no_log", logUri);
    ipc_send("popup", { text: "No log file found.", time: 1000 });
    return;
  }

  if (!firstPass) {
    ipc_send("log_read", 1);
  }

  if (debugLog) {
    firstPass = false;
  }

  if (renderer_state != 1) {
    // The renderer process is not ready, postpose reading the log
    //ipc_send("ipc_log", "readLog logloopmode: "+logLoopMode+", renderer state:"+renderer_state+", logSize: "+logSize+", prevLogSize: "+prevLogSize);
    return;
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
  processLogUser(logSegment);

  if (playerData.arenaId) {
    clearInterval(logLoopInterval);
  }
  prevLogSize = size;
}

// Process only the user data for initial loading (prior to log in)
// Same logic as processLog() but without the processLogData() function
function processLogUser(rawString) {
  var splitString = rawString.split("[UnityCrossThread");

  splitString.forEach(value => {
    //ipc_send("ipc_log", "Async: ("+index+")");

    // Get player Id
    let strCheck = '"playerId": "';
    if (value.indexOf(strCheck) > -1) {
      playerData.arenaId = dataChop(value, strCheck, '"');
    }

    // Get User name
    strCheck = '"screenName": "';
    if (value.indexOf(strCheck) > -1) {
      playerData.name = dataChop(value, strCheck, '"');
      ipc_send("set_player_data", playerData);
      ipc_send("init_login", true);
      ipc_send("ipc_log", "Arena screen name: " + playerData.name);
    }

    // Get Client Version
    strCheck = '"ClientVersion":"';
    if (value.indexOf(strCheck) > -1) {
      playerData.arenaVersion = dataChop(value, strCheck, '"');
      ipc_send("ipc_log", "Arena version: " + playerData.arenaVersion);
    }
    /*
    if (firstPass) {
      ipc_send("popup", {"text": "Reading: "+Math.round(100/splitString.length*index)+"%", "time": 1000});
    }
    */
  });

  if (firstPass && playerData.name == null) {
    ipc_send("popup", { text: "output_log contains no player data", time: 0 });
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

function setDraftCards(json) {
  ipc.send("set_draft_cards", currentDraft);
}

function actionLogGenerateLink(grpId) {
  var card = cardsDb.get(grpId);
  return (
    '<a class="card_link click-on" href="' + grpId + '">' + card.name + "</a>"
  );
}

var currentActionLog = "";

// Send action log data to overlay
function actionLog(seat, time, str, grpId = 0) {
  if (seat == -99) {
    currentActionLog = "";
  } else {
    var hh = ("0" + time.getHours()).slice(-2);
    var mm = ("0" + time.getMinutes()).slice(-2);
    var ss = ("0" + time.getSeconds()).slice(-2);
    currentActionLog +=
      hh + ":" + mm + ":" + ss + " " + stripTags(str) + "\r\n";

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

  //console.log("action_log", str, {seat: seat, time:time, grpId: grpId});
  ipc_send(
    "action_log",
    { seat: seat, time: time, str: str, grpId: grpId },
    windowOverlay
  );
}

var attackersDetected = [];
var zoneTransfers = [];

// Process zone transfers
// Sometimes GreToClient sends data about transfers when they havent been reported elsewhere
// Here we check if the object ID the transfer refers to exists in the main objects array and process it if it does
function tryZoneTransfers() {
  zoneTransfers.forEach(function(obj) {
    var _dest,
      _cat = undefined;
    var cname = "";
    var grpid = 0;
    var removeFromListAnyway = false;
    var removeFromList = true;

    var owner = -1;
    try {
      owner = currentMatch.gameObjs[obj.affectorId].controllerSeatId;
    } catch (e) {
      try {
        owner = currentMatch.gameObjs[obj.aff].controllerSeatId;
      } catch (e) {
        owner = currentMatch.opponent.seat;
      }
    }

    obj.details.forEach(function(detail) {
      if (detail.key == "zone_src") {
        _src = detail.valueInt32[0];
      }
      if (detail.key == "zone_dest") {
        _dest = detail.valueInt32[0];
      }
      if (detail.key == "category") {
        _cat = detail.valueString[0];
      }
    });

    // If the transfer is already in the gameObjs array..
    try {
      cname = currentMatch.gameObjs[obj.aff].name;
      grpid = currentMatch.gameObjs[obj.aff].grpId;
    } catch (e) {
      removeFromList = false;
    }

    // Try processing it
    try {
      var affectorGrpid;
      //console.log("AnnotationType_ZoneTransfer", obj, obj.aff, gameObjs, _src, _dest, _cat);
      if (_cat == "CastSpell") {
        actionLog(
          owner,
          obj.time,
          getNameBySeat(owner) + " casted " + actionLogGenerateLink(grpid)
        );
      } else if (_cat == "Resolve") {
        actionLog(
          owner,
          obj.time,
          getNameBySeat(owner) + " resolved " + actionLogGenerateLink(grpid)
        );
      } else if (_cat == "PlayLand") {
        actionLog(
          owner,
          obj.time,
          getNameBySeat(owner) + " played " + actionLogGenerateLink(grpid)
        );
      } else if (_cat == "Countered") {
        affectorGrpid = currentMatch.gameObjs[obj.affectorId].grpId;
        if (affectorGrpid == undefined) {
          removeFromList = false;
        } else {
          actionLog(
            owner,
            obj.time,
            actionLogGenerateLink(affectorGrpid) +
              " countered " +
              actionLogGenerateLink(grpid)
          );
        }
      } else if (_cat == "Destroy") {
        affectorGrpid = currentMatch.gameObjs[obj.affectorId].grpId;
        if (affectorGrpid == undefined) {
          removeFromList = false;
        } else {
          actionLog(
            owner,
            obj.time,
            actionLogGenerateLink(affectorGrpid) +
              " destroyed " +
              actionLogGenerateLink(grpid)
          );
        }
      } else if (_cat == "Draw") {
        actionLog(owner, obj.time, getNameBySeat(owner) + " drew a card");
        removeFromListAnyway = true;
      } else if (cname != "") {
        actionLog(
          owner,
          obj.time,
          actionLogGenerateLink(grpid) +
            " moved to " +
            currentMatch.zones[_dest].type
        );
      }
      currentMatch.gameObjs[obj.aff].zoneId = _dest;
      currentMatch.gameObjs[obj.aff].zoneName = currentMatch.zones[_dest].type;
    } catch (e) {
      removeFromList = false;
    }

    if (removeFromList || removeFromListAnyway) {
      obj.remove = true;
    }
  });
  if (zoneTransfers.length > 0) {
    zoneTransfers = zoneTransfers.filter(obj => obj.remove == false);
  }
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
  ipc_send("set_priority_timer", currentMatch.priorityTimers, windowOverlay);
}

// Get player name by seat in the game
function getNameBySeat(seat) {
  try {
    if (seat == currentMatch.player.seat) {
      return playerData.name.slice(0, -6);
    } else {
      return currentMatch.opponent.name.slice(0, -6);
    }
  } catch (e) {
    return "???";
  }
}

//
function updateCustomDecks() {
  decks.index.forEach(_deckid => {
    let _deck = decks[_deckid];
    try {
      //console.log(_deck.id, _deck);
      decks[_deck.id].custom = false;
      if (staticDecks.indexOf(_deck.id) == -1) {
        //console.error("CUSTOM!");
        decks[_deck.id].custom = true;
      }
    } catch (e) {
      //
    }
  });
}

//
function resetGameState() {
  zones = {};
  gameObjs = {};
  initialLibraryInstanceIds = [];
  idChanges = {};
  instanceToCardIdMap = {};
  attackersDetected = [];
  zoneTransfers = [];
  playerLife = 20;
  opponentLife = 20;
}

//
function checkForStartingLibrary() {
  if (gameStage != "GameStage_Start") return;
  if (
    !currentMatch.zones["ZoneType_Hand" + currentMatch.player.seat]
      .objectInstanceIds
  )
    return;
  if (
    !currentMatch.zones["ZoneType_Library" + currentMatch.player.seat]
      .objectInstanceIds
  )
    return;

  let hand =
    currentMatch.zones["ZoneType_Hand" + currentMatch.player.seat]
      .objectInstanceIds || [];
  let library =
    currentMatch.zones["ZoneType_Library" + currentMatch.player.seat]
      .objectInstanceIds || [];
  // Check that a post-mulligan scry hasn't been done
  if (library.length == 0 || library[library.length - 1] < library[0]) return;

  if (!currentDeck.mainDeck) return;
  if (hand.length + library.length == deck_count(currentDeck)) {
    if (hand.length >= 2 && hand[0] == hand[1] + 1) hand.reverse();
    initialLibraryInstanceIds = [...hand, ...library];
  }
}

//
function createMatch(arg) {
  actionLog(-99, new Date(), "");
  var obj = store.get("overlayBounds");

  currentMatch = cloneDeep(currentMatchDefault);

  if (!firstPass && store.get("settings").show_overlay == true) {
    if (store.get("settings").close_on_match) {
      ipc_send("renderer_hide", 1);
    }
    ipc_send("overlay_show", 1);
    ipc_send("overlay_set_bounds", obj);
  }

  let str = JSON.stringify(currentDeck);

  currentMatch.player.originalDeck = originalDeck;
  currentMatch.player.deck = JSON.parse(str);
  currentMatch.playerCards = JSON.parse(str);

  currentMatch.opponent.name = arg.opponentScreenName;
  currentMatch.opponent.rank = arg.opponentRankingClass;
  currentMatch.opponent.tier = arg.opponentRankingTier;
  currentMatch.eventId = arg.eventId;
  currentMatch.matchId = arg.matchId;

  currentMatch.beginTime = matchBeginTime;

  currentMatch.lastPriorityChangeTime = matchBeginTime;
  matchGameStats = [];
  matchCompletedOnGameNumber = 0;
  gameNumberCompleted = 0;
  gameStage = "";

  ipc_send("ipc_log", "vs " + currentMatch.opponent.name);
  ipc_send("set_timer", currentMatch.beginTime, windowOverlay);
  ipc_send("set_opponent", currentMatch.opponent.name, windowOverlay);
  ipc_send(
    "set_opponent_rank",
    get_rank_index(currentMatch.opponent.rank, currentMatch.opponent.tier),
    currentMatch.opponent.rank + " " + currentMatch.opponent.tier,
    windowOverlay
  );

  if (currentMatch.eventId == "DirectGame") {
    httpApi.httpTournamentCheck(currentDeck, currentMatch.opponent.name, true);
  }

  ipc_send("set_priority_timer", currentMatch.priorityTimers, windowOverlay);

  if (history[currentMatch.matchId]) {
    //skipMatch = true;
  }
}

//
function createDraft() {
  actionLog(-99, new Date(), "");
  var obj = store.get("overlayBounds");

  currentDraft = cloneDeep(currentDraftDefault);
  currentMatch = cloneDeep(currentMatchDefault);

  if (!firstPass && store.get("settings").show_overlay == true) {
    if (store.get("settings").close_on_match) {
      ipc_send("renderer_hide", 1);
    }

    ipc_send("overlay_show", 1);
    ipc_send("overlay_set_bounds", obj);
  }

  ipc_send("set_draft", true, windowOverlay);
  ipc_send("set_timer", -1, windowOverlay);
  ipc_send("set_opponent", "", windowOverlay);
}

//
function select_deck(arg) {
  if (arg.CourseDeck !== undefined) {
    currentDeck = arg.CourseDeck;
  } else {
    currentDeck = arg;
  }
  originalDeck = currentDeck;
  //console.log(currentDeck, arg);
  ipc_send("set_deck", currentDeck, windowOverlay);
}

//
function clear_deck() {
  var deck = { mainDeck: [], sideboard: [], name: "" };
  ipc_send("set_deck", deck, windowOverlay);
}

//
function update_deck(force) {
  var nd = new Date();
  if (nd - lastDeckUpdate > 1000 || debugLog || !firstPass || force) {
    if (overlayDeckMode == 0) {
      ipc_send("set_deck", currentMatch.playerCards, windowOverlay);
    }
    if (overlayDeckMode == 1) {
      ipc_send("set_deck", currentMatch.player.deck, windowOverlay);
    }
    if (overlayDeckMode == 2) {
      ipc_send("set_deck", currentMatch.playerCards, windowOverlay);
    }
    if (overlayDeckMode == 3) {
      let currentOppDeck = getOppDeck();
      ipc_send("set_deck", currentOppDeck, windowOverlay);
    }
    if (overlayDeckMode == 4) {
      ipc_send("set_deck", currentMatch.playerCards, windowOverlay);
    }
    lastDeckUpdate = nd;
  }
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
  if (
    (debugLog || !firstPass) &&
    currentMatch.playerCards.mainDeck != undefined
  ) {
    /*
    // DEBUG
    currentMatch.playerCards.mainDeck = [];
    decksize = 0;
    cardsleft = 0;
    */
    currentMatch.playerCards.mainDeck.forEach(function(card) {
      card.total = card.quantity;
      decksize += card.quantity;
      cardsleft += card.quantity;
    });
  }
  if (removeUsed) {
    Object.keys(currentMatch.gameObjs).forEach(function(key) {
      if (currentMatch.gameObjs[key] != undefined) {
        if (currentMatch.zones[currentMatch.gameObjs[key].zoneId]) {
          if (
            currentMatch.zones[currentMatch.gameObjs[key].zoneId].type !=
              "ZoneType_Limbo" &&
            currentMatch.zones[currentMatch.gameObjs[key].zoneId].type !=
              "ZoneType_Library"
          ) {
            if (
              currentMatch.gameObjs[key].ownerSeatId ==
                currentMatch.player.seat &&
              currentMatch.gameObjs[key].type != "GameObjectType_Token" &&
              currentMatch.gameObjs[key].type != "GameObjectType_Ability"
            ) {
              /*
              // DEBUG
              if (currentMatch.gameObjs[key].grpId != 3) {
                decksize += 1;
                cardsleft += 1;
                currentMatch.playerCards.mainDeck.push({id: currentMatch.gameObjs[key].grpId, quantity: currentMatch.gameObjs[key].zoneId})
              }
              */

              cardsleft -= 1;
              if (currentMatch.playerCards.mainDeck != undefined) {
                currentMatch.playerCards.mainDeck.forEach(function(card) {
                  if (card.id == currentMatch.gameObjs[key].grpId) {
                    //console.log(currentMatch.gameObjs[key].instanceId, cardsDb.get(currentMatch.gameObjs[key].grpId).name, currentMatch.zones[currentMatch.gameObjs[key].zoneId].type);
                    card.quantity -= 1;
                  }
                  if (card.quantity < 0) card.quantity = 0;
                });
              }
            }
          }
        }
      }
    });
  }

  if (
    (debugLog || !firstPass) &&
    currentMatch.playerCards.mainDeck != undefined
  ) {
    currentMatch.playerCards.mainDeck.forEach(function(card) {
      var c = cardsDb.get(card.id);
      if (c) {
        if (c.type.includes("Land", 0)) typeLan += card.quantity;
        else if (c.type.includes("Creature", 0)) typeCre += card.quantity;
        else if (c.type.includes("Artifact", 0)) typeArt += card.quantity;
        else if (c.type.includes("Enchantment", 0)) typeEnc += card.quantity;
        else if (c.type.includes("Instant", 0)) typeIns += card.quantity;
        else if (c.type.includes("Sorcery", 0)) typeSor += card.quantity;
        else if (c.type.includes("Planeswalker", 0)) typePla += card.quantity;
      }
      card.chance = Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, card.quantity) * 100
      );
    });

    currentMatch.playerCards.chanceCre =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typeCre) * 1000
      ) / 10;
    currentMatch.playerCards.chanceIns =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typeIns) * 1000
      ) / 10;
    currentMatch.playerCards.chanceSor =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typeSor) * 1000
      ) / 10;
    currentMatch.playerCards.chancePla =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typePla) * 1000
      ) / 10;
    currentMatch.playerCards.chanceArt =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typeArt) * 1000
      ) / 10;
    currentMatch.playerCards.chanceEnc =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typeEnc) * 1000
      ) / 10;
    currentMatch.playerCards.chanceLan =
      Math.round(
        hypergeometric(1, cardsleft, odds_sample_size, typeLan) * 1000
      ) / 10;
    currentMatch.playerCards.deckSize = decksize;
    currentMatch.playerCards.cardsLeft = cardsleft;
  }
}

//
function getOppDeck() {
  //var oppDeck = {mainDeck: [], sideboard : []};
  var doAdd = true;
  currentMatch.opponent.deck = { mainDeck: [], sideboard: [] };
  currentMatch.opponent.deck.name = currentMatch.opponent.name;
  //console.log("Deck "+currentMatch.opponent.name;);
  Object.keys(currentMatch.gameObjs).forEach(function(key) {
    if (currentMatch.gameObjs[key] != undefined) {
      if (
        currentMatch.zones[currentMatch.gameObjs[key].zoneId].type !=
        "ZoneType_Limbo"
      ) {
        //console.log(cardsDb.get(currentMatch.gameObjs[key].grpId), cardsDb.get(currentMatch.gameObjs[key].grpId).name, currentMatch.zones[currentMatch.gameObjs[key].zoneId].type, currentMatch.gameObjs[key]);
        if (
          currentMatch.gameObjs[key].ownerSeatId ==
            currentMatch.opponent.seat &&
          currentMatch.gameObjs[key].type != "GameObjectType_SplitLeft" &&
          currentMatch.gameObjs[key].type != "GameObjectType_SplitRight" &&
          currentMatch.gameObjs[key].type != "GameObjectType_Token" &&
          currentMatch.gameObjs[key].type != "GameObjectType_Ability"
        ) {
          doAdd = true;
          currentMatch.opponent.deck.mainDeck.forEach(function(card) {
            if (card.id == currentMatch.gameObjs[key].grpId) {
              doAdd = false;
              //card.quantity += 1;
            }
          });
          if (doAdd) {
            if (cardsDb.get(currentMatch.gameObjs[key].grpId) != false) {
              currentMatch.opponent.deck.mainDeck.push({
                id: currentMatch.gameObjs[key].grpId,
                quantity: 9999
              });
            }
          }
        }
      }
    }
  });

  //
  let format = eventsToFormat[currentMatch.eventId];
  currentMatch.opponent.deck.archetype = "-";
  if (format && deck_archetypes[format]) {
    deck_archetypes[format].sort(compare_archetypes);

    let possible = deck_archetypes[format];
    let bestMatch = "-";
    let bestMatchRate = 0;
    possible.forEach(arch => {
      let found = 0;
      arch.cards.forEach(card => {
        let cName = cardsDb.get(card.id).name;

        currentMatch.opponent.deck.mainDeck.forEach(oppCard => {
          let oName = cardsDb.get(oppCard.id).name;
          if (cName == oName) {
            found += card.quantity / arch.average;
          }
        });
      });
      if (found > bestMatchRate) {
        bestMatchRate = found;
        bestMatch = arch.tag;
      }
    });
    currentMatch.opponent.deck.archetype = bestMatch;
  }

  return currentMatch.opponent.deck;
}

//
function saveEconomy(json) {
  var ctx = json.context;
  json.id = sha1(json.date.getTime() + ctx);
  json.date = new Date();

  if (ctx.indexOf("Quest.Completed") !== -1) {
    json.context = "Quest Completed";
  }
  if (ctx.indexOf("Booster.Open") !== -1) {
    json.context = "Booster Open";
  }
  if (ctx.indexOf("PlayerReward") !== -1) {
    json.context = "Player Rewards";
  }
  if (ctx.indexOf("WildCard.Redeem") !== -1) {
    json.context = "Redeem Wildcard";
  }
  if (ctx.indexOf("Store.Fulfillment") !== -1) {
    json.context = "Store";
  }
  if (ctx.indexOf("Event.Prize") !== -1) {
    json.context = "Event Prize";
  }
  if (ctx.indexOf("Event.PayEntry") !== -1) {
    json.context = "Pay Event Entry";
  }
  if (ctx.indexOf("Event.GrantCardPool") !== -1) {
    json.context = "Event Card Pool";
  }
  if (ctx.indexOf("Event.Season.Constructed.Payout") !== -1) {
    json.context = "Constructed Season Rewards";
  }
  if (ctx.indexOf("Event.Season.Limited.Payout") !== -1) {
    json.context = "Limited Season Rewards";
  }

  var economy_index = store.get("economy_index");

  if (!economy_index.includes(json.id)) {
    economy_index.push(json.id);
  }

  httpApi.httpSetEconomy(json);

  economy[json.id] = json;
  economy.changes = economy_index;
  store.set("economy_index", economy_index);
  store.set(json.id, json);
}

//
function saveCourse(json) {
  json.id = json._id;
  json.date = new Date();
  delete json._id;

  var courses_index = store.get("courses_index");

  if (!courses_index.includes(json.id)) {
    courses_index.push(json.id);
  } else {
    json.date = store.get(json.id).date;
  }

  // add locally
  if (!events.courses.includes(json.id)) {
    events.courses.push(json.id);
  }

  json.type = "Event";
  events[json.id] = json;
  store.set("courses_index", courses_index);
  store.set(json.id, json);
}

//
function saveMatch(matchId) {
  if (currentMatch.matchTime == 0 || currentMatch.matchId != matchId) {
    return;
  }

  let pw = 0;
  let ow = 0;
  let dr = 0;
  currentMatch.results.forEach(function(res) {
    if (res.scope == "MatchScope_Game") {
      if (res.result == "ResultType_Draw") {
        dr += 1;
      } else if (res.winningTeamId == currentMatch.player.seat) {
        pw += 1;
      }
      if (res.winningTeamId == currentMatch.opponent.seat) {
        ow += 1;
      }
    }
  });

  var match = {};
  match.id = currentMatch.matchId;
  match.duration = currentMatch.matchTime;
  match.opponent = {
    name: currentMatch.opponent.name,
    rank: currentMatch.opponent.rank,
    tier: currentMatch.opponent.tier,
    userid: currentMatch.opponent.id,
    seat: currentMatch.opponent.seat,
    win: ow
  };
  match.player = {
    name: currentMatch.player.name,
    rank: playerData.rank.constructed.rank,
    tier: playerData.rank.constructed.tier,
    userid: currentMatch.player.id,
    seat: currentMatch.player.seat,
    win: pw
  };
  match.draws = dr;
  match.eventId = currentMatch.eventId;
  match.playerDeck = currentMatch.player.originalDeck;
  match.oppDeck = getOppDeck();
  if (match.oppDeck.archetype && match.oppDeck.archetype !== "-") {
    match.tags = [match.oppDeck.archetype];
  }

  match.date = new Date();
  match.bestOf = currentMatch.bestOf;

  match.gameStats = matchGameStats;

  // Convert string "2.2.19" into number for easy comparison, 1 byte per part, allowing for versions up to 255.255.255
  match.toolVersion = electron.remote.app
    .getVersion()
    .split(".")
    .reduce((acc, cur) => +acc * 256 + +cur);

  console.log("Save match:", match);
  var matches_index = store.get("matches_index");

  if (!matches_index.includes(currentMatch.matchId)) {
    matches_index.push(currentMatch.matchId);
  } else {
    let cm = store.get(currentMatch.matchId);
    match.date = cm.date;
    match.tags = cm.tags;
  }

  // add locally
  if (!history.matches.includes(currentMatch.matchId)) {
    history.matches.push(currentMatch.matchId);
  }

  store.set("matches_index", matches_index);
  store.set(currentMatch.matchId, match);

  history[currentMatch.matchId] = match;
  history[currentMatch.matchId].type = "match";
  if (matchCompletedOnGameNumber == gameNumberCompleted) {
    httpApi.httpSetMatch(match);
  }
  requestHistorySend(0);
  ipc_send("set_timer", 0, windowOverlay);
  ipc_send("popup", { text: "Match saved!", time: 3000 });
}

//
function saveDraft() {
  if (currentDraft.draftId != undefined) {
    currentDraft.draftId = currentDraft.draftId + "-draft";

    currentDraft.id = currentDraft.draftId;
    currentDraft.date = new Date();
    currentDraft.owner = playerData.name;

    console.log("Save draft:", currentDraft);

    var draft_index = store.get("draft_index");
    // add to config
    if (!draft_index.includes(currentDraft.draftId)) {
      draft_index.push(currentDraft.draftId);
    } else {
      currentDraft.date = store.get(currentDraft.draftId).date;
    }

    // add locally
    if (!history.matches.includes(currentDraft.draftId)) {
      history.matches.push(currentDraft.draftId);
    }

    store.set("draft_index", draft_index);
    store.set(currentDraft.draftId, currentDraft);
    history[currentDraft.draftId] = currentDraft;
    history[currentDraft.draftId].type = "draft";
    httpApi.httpSetDraft(currentDraft);
    requestHistorySend(0);
    ipc_send("popup", { text: "Draft saved!", time: 3000 });
  } else {
    console.log("Couldnt save draft with undefined ID:", currentDraft);
  }
}

//
function updateLoading(entry) {
  if (firstPass) {
    ipc_send("popup", {
      text: `Reading log: ${Math.round((100 / entry.size) * entry.position)}%`,
      time: 0
    });
  }
}

//
function updateRank() {
  ipc_send("set_player_data", playerData);
}

///
function finishLoading() {
  if (firstPass) {
    firstPass = false;

    if (duringMatch) {
      ipc_send("renderer_hide", 1);
      ipc_send("overlay_show", 1);
      update_deck(false);
    }
    var obj = store.get("overlayBounds");
    ipc_send("overlay_set_bounds", obj);

    requestHistorySend(0);
    ipc_send("initialize", 1);

    obj = store.get("windowBounds");
    ipc_send("renderer_set_bounds", obj);

    if (playerData.name != null) {
      httpApi.httpSetPlayer(
        playerData.name,
        playerData.rank.constructed.rank,
        playerData.rank.constructed.tier,
        playerData.rank.limited.rank,
        playerData.rank.limited.tier
      );
    }
    ipc_send("popup", { text: `Reading log: 100%`, time: 1000 });
    logReadEnd = new Date();
    let logReadElapsed = (logReadEnd - logReadStart) / 1000;
    ipc_send("ipc_log", `Log read in ${logReadElapsed}s`);
  }
}

// Utility functions that belong only to background

//
function parseWotcTime(str) {
  try {
    let datePart = str.split(" ")[0];
    let timePart = str.split(" ")[1];
    let midnight = str.split(" ")[2];

    datePart = datePart.split("/");
    timePart = timePart.split(":");

    timePart.forEach(function(s, index) {
      timePart[index] = parseInt(s);
    });
    datePart.forEach(function(s, index) {
      datePart[index] = parseInt(s);
    });

    if (midnight == "PM" && timePart[0] != 12) {
      timePart[0] += 12;
    }
    if (midnight == "AM" && timePart[0] == 12) {
      timePart[0] = 0;
    }

    var date = new Date(
      datePart[2],
      datePart[0] - 1,
      datePart[1],
      timePart[0],
      timePart[1],
      timePart[2]
    );
    return date;
  } catch (e) {
    return new Date();
  }
}

function normaliseFields(iterator) {
  if (typeof iterator == "object") {
    return transform(iterator, function(result, value, key) {
      let nkey =
        typeof key == "string" ? key.replace(/List$/, "").toLowerCase() : key;
      result[nkey] = normaliseFields(value);
    });
  }
  return iterator;
}

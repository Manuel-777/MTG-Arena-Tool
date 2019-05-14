/*
global
  cardsDb,
  compare_archetypes,
  Deck,
  eventsToFormat,
  getDeck,
  stripTags,
  windowBackground,
  windowRenderer,
  windowOverlay,
  get_rank_index,
  playerDataDefault,
  hypergeometricRange,
  onLabelOutLogInfo,
  onLabelGreToClient,
  objectClone,
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelInEventGetPlayerCourse,
  onLabelInEventGetPlayerCourseV2,
  onLabelInEventGetCombinedRankInfo,
  onLabelInDeckGetDeckLists,
  onLabelInDeckGetDeckListsV3,
  onLabelInEventGetPlayerCourses,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInDeckUpdateDeck,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
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
  HIDDEN_PW
*/
var electron = require("electron");
const { remote, app, net, clipboard } = require("electron");

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
}

const path = require("path");
const Store = require("electron-store");
const fs = require("fs");
const sha1 = require("js-sha1");
const ipc = electron.ipcRenderer;

const {
  parseWotcTime,
  parseWotcTime2,
  normaliseFields
} = require("./background-util");

const transform = require("lodash.transform");
const cloneDeep = require("lodash.clonedeep");

const httpApi = require("./http-api");
const manifestParser = require("./manifest-parser");
const greToClientInterpreter = require("./gre-to-client-interpreter");

const rememberCfg = {
  email: "",
  token: "",
  settings: {
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false
  }
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
    back_url: "",
    right_panel_width: 200
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
  decks_last_used: [],
  tags_colors: {},
  decks: {},
  wildcards_history: []
};

var rstore = new Store({
  name: "remember",
  defaults: rememberCfg
});

var store = new Store({
  name: "default",
  defaults: defaultCfg
});

var settingsStore = new Store({
  name: "settings",
  defaults: settingsCfg
});

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
  playerChances: {},
  playerCardsLeft: {},
  oppCards: {},
  onThePlay: 0,
  GREtoClient: {},
  processedAnnotations: [],
  timers: {},
  zones: [],
  players: {},
  annotations: [],
  gameObjs: {},
  gameInfo: {},
  gameStage: "",
  turnInfo: {},
  playerCardsUsed: [],
  oppCardsUsed: [],
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
let initialLibraryInstanceIds = [];
let idChanges = {};
let instanceToCardIdMap = {};

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

var lastDeckUpdate = new Date();

// Begin of IPC messages recievers
function ipc_send(method, arg, to = windowRenderer) {
  if (method == "ipc_log") {
    //
  }
  //console.log("IPC SEND", method, arg, to);
  ipc.send("ipc_switch", method, windowBackground, arg, to);
}

//
ipc.on("save_app_settings", function(event, arg) {
  ipc_send("show_loading");
  const rSettings = rstore.get("settings");
  const updated = { ...rSettings, ...arg };

  if (!updated.remember_me) {
    rstore.set("email", "");
    rstore.set("token", "");
  }

  loadSettings(updated);
  rstore.set("settings", updated);
  ipc_send("hide_loading");
});

//
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

  let username = "";
  let password = "";
  const remember_me = rstore.get("settings").remember_me;

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
});

function offlineLogin() {
  ipc_send("auth", { ok: true, user: -1 });
  ipc_send("set_offline", true);
  loadPlayerConfig(playerData.arenaId);
  playerData.userName = "";
}

//
ipc.on("auto_login", () => {
  const rSettings = rstore.get("settings");
  if (!rSettings.auto_login) return;

  tokenAuth = rstore.get("token");
  ipc_send("popup", {
    text: "Logging in automatically...",
    time: 0
  });
  if (rSettings.remember_me) {
    httpApi.httpAuth(rstore.get("email"), HIDDEN_PW);
  } else {
    offlineLogin();
  }
});

//
ipc.on("login", function(event, arg) {
  if (arg.password == HIDDEN_PW) {
    tokenAuth = rstore.get("token");
    playerData.userName = arg.username;
    httpApi.httpAuth(arg.username, arg.password);
  } else if (arg.username == "" && arg.password == "") {
    offlineLogin();
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
ipc.on("save_user_settings", function(event, settings) {
  ipc_send("show_loading");
  const oldSettings = store.get("settings");
  const updated = { ...oldSettings, ...settings };
  loadSettings(updated);
  store.set("settings", updated);
  ipc_send("hide_loading");
});

//
ipc.on("delete_data", function() {
  httpApi.httpDeleteData();
});

//
ipc.on("archive_deck", function(event, arg) {
  ipc_send("show_loading");
  decks[arg].archived = true;
  store.set("decks." + arg, decks[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("unarchive_deck", function(event, arg) {
  ipc_send("show_loading");
  decks[arg].archived = false;
  store.set("decks." + arg, decks[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("archive_course", function(event, arg) {
  ipc_send("show_loading");
  events[arg].archived = true;
  store.set(arg, events[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("unarchive_course", function(event, arg) {
  ipc_send("show_loading");
  events[arg].archived = false;
  store.set(arg, events[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("archive_match", function(event, arg) {
  ipc_send("show_loading");
  history[arg].archived = true;
  store.set(arg, history[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("unarchive_match", function(event, arg) {
  ipc_send("show_loading");
  history[arg].archived = false;
  store.set(arg, history[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("archive_economy", function(event, _id) {
  ipc_send("show_loading");
  economy[_id].archived = true;
  store.set(_id, economy[_id]);
  ipc_send("hide_loading");
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
    ipc_send("set_history", JSON.stringify(history));
  } else {
    /// Send only the data
    ipc_send("set_history_data", JSON.stringify(history));
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
    httpApi.httpGetExplore(arg, cards);
  }
});

ipc.on("request_economy", function() {
  sendEconomy();
});

ipc.on("request_course", function(event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", (event, set) => {
  if (playerData.userName == "") {
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

// Loads this player's configuration file
function loadPlayerConfig(playerId, serverData = undefined) {
  ipc_send("ipc_log", "Load player ID: " + playerId);
  store = new Store({
    name: playerId,
    defaults: defaultCfg
  });

  // Preload config, if we use store.get turned out to be SLOOOW
  var entireConfig = store.get();
  var id, item;
  history.matches = entireConfig["matches_index"];

  if (entireConfig["decks_last_used"]) {
    playerData.decks_last_used = entireConfig["decks_last_used"];
  }

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

  if (serverData) {
    let requestSync = {};
    requestSync.courses = serverData.courses.filter(_id => !entireConfig[_id]);
    requestSync.matches = serverData.matches.filter(_id => !entireConfig[_id]);
    requestSync.drafts = serverData.drafts.filter(_id => !entireConfig[_id]);
    requestSync.economy = serverData.economy.filter(_id => !entireConfig[_id]);
    console.log("requestSync", requestSync);

    if (
      requestSync.courses.length +
        requestSync.matches.length +
        requestSync.drafts.length +
        requestSync.economy.length >
      0
    ) {
      httpApi.httpSyncRequest(requestSync);
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

function syncUserData(data) {
  // Sync Events
  var courses_index = store.get("courses_index");
  data.courses.forEach(doc => {
    doc.id = doc._id;
    delete doc._id;
    if (!courses_index.includes(doc.id)) {
      courses_index.push(doc.id);
      store.set(doc.id, doc);
      events[doc.id] = doc;
    }
  });
  store.set("courses_index", courses_index);

  // Sync Matches
  var matches_index = store.get("matches_index");
  data.matches.forEach(doc => {
    doc.id = doc._id;
    delete doc._id;
    if (!matches_index.includes(doc.id)) {
      matches_index.push(doc.id);
      store.set(doc.id, doc);
      history[doc.id] = doc;
      history.matches.push(doc.id);
    }
  });
  store.set("matches_index", matches_index);
  requestHistorySend(0);

  // Sync Economy
  var economy_index = store.get("economy_index");
  data.economy.forEach(doc => {
    doc.id = doc._id;
    delete doc._id;
    if (!economy_index.includes(doc.id)) {
      economy_index.push(doc.id);
      store.set(doc.id, doc);
      economy[doc.id] = doc;
      economy.changes = economy_index;
    }
  });
  store.set("economy_index", economy_index);

  // Sync Drafts
  var draft_index = store.get("draft_index");
  data.drafts.forEach(doc => {
    doc.id = doc._id;
    delete doc._id;
    if (!draft_index.includes(doc.id)) {
      draft_index.push(doc.id);
      store.set(doc.id, doc);

      history[doc.id] = doc;
    }
  });
  store.set("draft_index", draft_index);
}

// Loads and combines settings variables, sends result to display
function loadSettings(dirtySettings = {}) {
  // Blends together default, user, app, and optional dirty config
  // "dirty" config may be a subset, which allows early UI updates
  //  to make UI responsive without waiting for slow store IO
  // Since settings have migrated between areas, collisions happen
  // Order of precedence is: dirty > app > user > defaults
  const settings = store.get("settings");
  const rSettings = rstore.get("settings");
  const _settings = {
    ...defaultCfg.settings,
    ...settings,
    ...rSettings,
    ...dirtySettings
  };

  if (_settings.decks_last_used == undefined) _settings.decks_last_used = [];

  //console.log(_settings);
  //const exeName = path.basename(process.execPath);

  skipFirstPass = _settings.skip_firstpass;

  ipc_send("overlay_set_ontop", _settings.overlay_ontop);

  if (_settings.show_overlay == false) {
    ipc_send("overlay_close", 1);
  } else if (duringMatch || _settings.show_overlay_always) {
    ipc_send("overlay_show", 1);
  }

  ipc_send("set_settings", _settings);
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
      try {
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
      } catch (err) {
        console.log(entry.label, entry.position, entry.json());
        console.error(err);
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
      ipc_send("ipc_log", "Arena screen name: " + playerData.name);
    }

    // Get Client Version
    strCheck = '"clientVersion": "';
    if (value.indexOf(strCheck) > -1) {
      playerData.arenaVersion = dataChop(value, strCheck, '"');
      ipc_send("ipc_log", "Arena version: " + playerData.arenaVersion);
      // We request manifest data here
      //manifestParser.requestManifestData(playerData.arenaVersion);
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
    currentActionLog = "version: 0\r\n";
  } else {
    var hh = ("0" + time.getHours()).slice(-2);
    var mm = ("0" + time.getMinutes()).slice(-2);
    var ss = ("0" + time.getSeconds()).slice(-2);
    /*
    str = str.replace(/(<([^>]+)>)/gi, "");
    */

    currentActionLog += `${seat}\r\n`;
    currentActionLog += `${hh}:${mm}:${ss}\r\n`;
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
    windowOverlay
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
  ipc_send("set_priority_timer", currentMatch.priorityTimers, windowOverlay);
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
  if (decks.index.indexOf(customDeck.id) == -1) {
    decks.index.push(customDeck.id);
  }
  decks[customDeck.id] = customDeck;
  updateCustomDecks();
  store.set("decks_index", decks.index);
  store.set("decks." + customDeck.id, customDeck);
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

  currentMatch.player.originalDeck = originalDeck;
  currentMatch.player.deck = originalDeck.clone();
  currentMatch.playerCardsLeft = originalDeck.clone();

  currentMatch.opponent.name = arg.opponentScreenName;
  currentMatch.opponent.rank = arg.opponentRankingClass;
  currentMatch.opponent.tier = arg.opponentRankingTier;
  currentMatch.opponent.cards = [];
  currentMatch.eventId = arg.eventId;
  currentMatch.matchId = arg.matchId + "-" + playerData.arenaId;
  currentMatch.gameStage = "";

  currentMatch.beginTime = matchBeginTime;

  currentMatch.lastPriorityChangeTime = matchBeginTime;
  matchGameStats = [];
  matchCompletedOnGameNumber = 0;
  gameNumberCompleted = 0;
  initialLibraryInstanceIds = [];
  idChanges = {};
  instanceToCardIdMap = {};

  ipc_send("ipc_log", "vs " + currentMatch.opponent.name);
  ipc_send("set_timer", currentMatch.beginTime, windowOverlay);
  ipc_send("set_opponent", currentMatch.opponent.name, windowOverlay);
  ipc_send(
    "set_opponent_rank",
    get_rank_index(currentMatch.opponent.rank, currentMatch.opponent.tier),
    currentMatch.opponent.rank + " " + currentMatch.opponent.tier,
    windowOverlay
  );

  if (currentMatch.eventId == "DirectGame" && currentDeck) {
    let str = currentDeck.getSave();
    httpApi.httpTournamentCheck(str, currentMatch.opponent.name, true);
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
  if (arg.CourseDeck) {
    currentDeck = new Deck(arg.CourseDeck);
  } else {
    currentDeck = new Deck(arg);
  }
  console.log("Select deck: ", currentDeck, arg);
  originalDeck = currentDeck.clone();
  ipc_send("set_deck", currentDeck.getSave(), windowOverlay);
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
    forceDeckUpdate();

    let currentMatchCopy = objectClone(currentMatch);
    currentMatchCopy.oppCards = getOppDeck();
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
    ipc_send("set_match", currentMatchCopy, windowOverlay);
  }
}

function getOppDeck() {
  let _deck = new Deck({}, currentMatch.oppCardsUsed, false);
  _deck.mainboard.removeDuplicates(true);
  _deck.getColors();

  let format = eventsToFormat[currentMatch.eventId];
  currentMatch.opponent.deck.archetype = "-";
  let bestMatch = "-";
  if (format && deck_archetypes[format]) {
    deck_archetypes[format].sort(compare_archetypes);

    let possible = deck_archetypes[format];
    let bestMatchRate = 0;
    possible.forEach(arch => {
      let found = 0;
      arch.cards.forEach(card => {
        let cName = cardsDb.get(card.id).name;

        _deck.mainboard.get().forEach(oppCard => {
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
  }

  _deck = _deck.getSave();
  _deck.archetype = bestMatch;

  return _deck;
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
  }

  if (debugLog || !firstPass) {
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
  let id = transaction.id;
  let economyIndex = store.get("economy_index");

  if (!economyIndex.includes(id)) {
    economyIndex.push(id);
    store.set("economy_index", economyIndex);
    economy.changes = economyIndex;
  }

  economy[id] = transaction;
  store.set(id, transaction);

  httpApi.httpSetEconomy(transaction);
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
  //console.log(currentMatch.matchId, matchId);
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
  match.onThePlay = currentMatch.onThePlay;
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
    name: playerData.name,
    rank: playerData.rank.constructed.rank,
    tier: playerData.rank.constructed.tier,
    userid: playerData.arenaId,
    seat: currentMatch.player.seat,
    win: pw
  };
  match.draws = dr;

  match.eventId = currentMatch.eventId;
  match.playerDeck = currentMatch.player.originalDeck.getSave();
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
  match.toolRunFromSource = !electron.remote.app.isPackaged;

  console.log("Save match:", match);
  var matches_index = store.get("matches_index");

  if (!matches_index.includes(currentMatch.matchId)) {
    matches_index.push(currentMatch.matchId);
  } else {
    let cm = store.get(currentMatch.matchId);
    match.date = cm.date;
    match.tags = cm.tags;
  }

  // Add deck to last used array
  if (match.playerDeck && match.playerDeck.id) {
    let decks_last_used = store.get("decks_last_used");
    let deckId = match.playerDeck.id;
    if (decks_last_used.includes(deckId)) {
      let pos = decks_last_used.indexOf(deckId);
      decks_last_used.splice(pos, 1);
    }
    decks_last_used.push(deckId);
    store.set("decks_last_used", decks_last_used);
    playerData.decks_last_used = decks_last_used;
    ipc_send("set_decks_last_used", decks_last_used);
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

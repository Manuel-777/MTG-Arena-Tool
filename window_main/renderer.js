/*
global
  Aggregator,
  setsList,
  cardsDb,
  makeId,
  timeSince,
  addCardHover,
  addCardSeparator,
  addCardTile,
  getReadableEvent,
  get_deck_colors,
  get_deck_types_ammount,
  get_deck_export,
  get_deck_export_txt,
  get_rank_index_16,
  get_rank_index,
  draftRanks
  get_card_type_sort,
  compare_colors,
  compare_cards,
  windowBackground,
  windowRenderer,
  deck_count_types,
  removeDuplicates,
  HIDDEN_PW,
  $$
*/

const electron = require("electron");
const remote = require("electron").remote;

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

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

require("time-elements");

const FilterPanel = require("./FilterPanel.js");
const StatsPanel = require("./StatsPanel.js");
const open_home_tab = require("./home").open_home_tab;
const tournamentOpen = require("./tournaments").tournamentOpen;
const tournamentCreate = require("./tournaments").tournamentCreate;
const tournamentSetState = require("./tournaments").tournamentSetState;
const open_deck = require("./deck_details").open_deck;
const open_decks_tab = require("./decks").open_decks_tab;
const { open_history_tab, setFilters } = require("./history");
const openExploreTab = require("./explore").openExploreTab;
const setExploreDecks = require("./explore").setExploreDecks;
const updateExploreCheckbox = require("./explore").updateExploreCheckbox;
const openCollectionTab = require("./collection").openCollectionTab;
const openEventsTab = require("./events").openEventsTab;
const expandEvent = require("./events").expandEvent;

const open_economy_tab = require("./economy").open_economy_tab;
const set_economy_history = require("./economy").set_economy_history;

const { RANKED_CONST, RANKED_DRAFT, DATE_SEASON } = Aggregator;

var orderedCardTypes = ["cre", "lan", "ins", "sor", "enc", "art", "pla"];
var orderedCardTypesDesc = [
  "Creatures",
  "Lands",
  "Instants",
  "Sorceries",
  "Enchantments",
  "Artifacts",
  "Planeswalkers"
];
var orderedCardRarities = ["common", "uncommon", "rare", "mythic"];
var orderedManaColors = [
  "#E7CA8E",
  "#AABEDF",
  "#A18E87",
  "#DD8263",
  "#B7C89E",
  "#E3E3E3"
];

let shell = electron.shell;
let ipc = electron.ipcRenderer;
let decks = null;
let changes = null;
let matchesHistory = [];
let eventsHistory = [];

let explore = null;
let ladder = null;
let cards = {};
let cardsNew = {};
let settings = null;
let updateState = "";
let sidebarActive = -1;
let filterEvent = "All";
let filterSort = "By Winrate";

let draftPosition = 1;
let overlayAlpha = 1;
let overlayAlphaBack = 1;
let overlayScale = 1;
let cardSizePos = 4;
let cardSize = 140;
let cardQuality = "normal";
let loadEvents = 0;
let defaultBackground = "";
let lastSettingsSection = 1;
let loggedIn = false;
let canLogin = false;
let offlineMode = false;

let playerData = playerDataDefault;

let economyHistory = [];

let season_starts = new Date();
let season_ends = new Date();
let rewards_daily_ends = new Date();
let rewards_weekly_ends = new Date();
let activeEvents = [];

let filteredWildcardsSet = "";

let deck_tags = {};
let tags_colors = {};
let authToken = null;
let discordTag = null;

let sidebarSize = 200;

const sha1 = require("js-sha1");
const fs = require("fs");
const path = require("path");

const actionLogDir = path.join(
  (electron.app || electron.remote.app).getPath("userData"),
  "actionlogs"
);

let mana = {
  0: "",
  1: "white",
  2: "blue",
  3: "black",
  4: "red",
  5: "green",
  6: "colorless",
  7: "",
  8: "x"
};

function ipc_send(method, arg, to = windowBackground) {
  // 0: Main window
  // 1: background
  // 2: overlay
  ipc.send("ipc_switch", method, windowRenderer, arg, to);
}

window.onerror = (msg, url, line, col, err) => {
  var error = {
    msg: err.msg,
    stack: err.stack,
    line: line,
    col: col
  };
  ipc_send("ipc_error", error);
  console.log("Error: ", error);
};

process.on("uncaughtException", function(err) {
  ipc_send("ipc_log", "Exception: " + err);
});

process.on("warning", warning => {
  ipc_send("ipc_log", "Warning: " + warning.message);
  ipc_send("ipc_log", "> " + warning.stack);
});

//
ipc.on("clear_pwd", function() {
  document.getElementById("signin_pass").value = "";
});

//
ipc.on("auth", function(event, arg) {
  authToken = arg.token;
  if (arg.ok) {
    $(".message_center").css("display", "flex");
    $(".authenticate").hide();
    loggedIn = true;
  } else {
    canLogin = true;
    ipc_send("renderer_show");
    pop(arg.error, -1);
  }
});

ipc.on("set_discord_tag", (event, arg) => {
  discordTag = arg;
  if (sidebarActive == -1) {
    open_home_tab(null, true);
  }
});

ipc.on("set_tou_state", (event, arg) => {
  set_tou_state(arg);
});

//
ipc.on("too_slow", function() {
  pop(
    'Loading is taking too long, please read our <a class="trouble_link">troubleshooting guide</a>.',
    0
  );

  $(".popup").css("left", "calc(50% - 280px)");
  $(".popup").css("width", "560px");
  $(".popup").css("pointer-events", "all");

  $(".trouble_link").click(function() {
    shell.openExternal(
      "https://github.com/Manuel-777/MTG-Arena-Tool/blob/master/TROUBLESHOOTING.md"
    );
  });
});

function getTagColor(tag) {
  let tc = tags_colors[tag];
  if (tc) return tc;

  return "#FAE5D2";
}

//
function setTagColor(tag, color) {
  tags_colors[tag] = color;
}

//
ipc.on("set_tags_colors", function(event, arg) {
  tags_colors = arg;
});

//
ipc.on("set_db", function(event, arg) {
  try {
    arg = JSON.parse(arg);
    setsList = arg.sets;
    eventsList = arg.events;
    eventsToFormat = arg.events_format;
    rankedEvents = arg.ranked_events;
    delete arg.sets;
    delete arg.events;
    delete arg.events_format;
    delete arg.ranked_events;
    cardsDb.set(arg);
    canLogin = true;
    showLogin();
  } catch (e) {
    pop("Error parsing metadata", null);
    console.log("Error parsing metadata", e);
    return false;
  }
});

ipc.on("show_login", () => {
  canLogin = true;
  showLogin();
});

function showLogin() {
  $(".authenticate").show();
  $(".message_center").css("display", "none");
  $(".init_loading").hide();
  $(".button_simple_disabled").addClass("button_simple");
  $("#signin_user").focus();
}

//
ipc.on("set_player_data", (event, _data) => {
  playerData = _data;

  if (sidebarActive != -99) {
    $(".top_username").html(playerData.name.slice(0, -6));
    $(".top_username_id").html(playerData.name.slice(-6));

    let rankOffset;
    let constructed = playerData.rank.constructed;
    rankOffset = get_rank_index(constructed.rank, constructed.tier);
    let constructedRankIcon = $$(".top_constructed_rank")[0];
    constructedRankIcon.style.backgroundPosition = rankOffset * -48 + "px 0px";
    constructedRankIcon.setAttribute(
      "title",
      constructed.rank + " " + constructed.tier
    );

    let limited = playerData.rank.limited;
    rankOffset = get_rank_index(limited.rank, limited.tier);
    let limitedRankIcon = $$(".top_limited_rank")[0];
    limitedRankIcon.style.backgroundPosition = rankOffset * -48 + "px 0px";
    limitedRankIcon.setAttribute("title", limited.rank + " " + limited.tier);

    let patreonIcon = $$(".top_patreon")[0];
    if (playerData.patreon) {
      let xoff = -40 * playerData.patreon_tier;
      let title = "Patreon Basic Tier";

      if (playerData.patreon_tier == 1) title = "Patreon Standard Tier";
      if (playerData.patreon_tier == 2) title = "Patreon Modern Tier";
      if (playerData.patreon_tier == 3) title = "Patreon Legacy Tier";
      if (playerData.patreon_tier == 4) title = "Patreon Vintage Tier";

      patreonIcon.style.backgroundPosition = xoff + "px 0px";
      patreonIcon.setAttribute("title", title);
      patreonIcon.style.display = "block";
    } else {
      patreonIcon.style.display = "none";
    }
  }
});

//
ipc.on("set_decks_last_used", (event, arg) => {
  playerData.decks_last_used = arg;
});

//
ipc.on("set_season", function(event, arg) {
  season_starts = arg.starts;
  season_ends = arg.ends;
});

ipc.on("set_reward_resets", function(event, arg) {
  rewards_daily_ends = new Date(arg.daily);
  rewards_weekly_ends = new Date(arg.weekly);
});

//
ipc.on("set_decks", function(event, arg) {
  try {
    arg = JSON.parse(arg);
  } catch (e) {
    console.log("Error parsing JSON:", arg);
    return false;
  }
  if (arg != null) {
    delete arg.index;
    decks = Object.values(arg);
  }
  open_decks_tab();
});

//
// Whats this?
ipc.on("set_deck_updated", function(event, str) {
  try {
    deck = JSON.parse(str);
  } catch (e) {
    console.log("Error parsing JSON:", str);
    return false;
  }
});

//
ipc.on("set_history", function(event, arg) {
  if (arg != null) {
    try {
      matchesHistory = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  open_history_tab(0);
});

//
ipc.on("set_history_data", function(event, arg) {
  if (arg != null) {
    matchesHistory = JSON.parse(arg);
  }
});

//
ipc.on("set_events", function(event, arg) {
  if (arg != null) {
    try {
      eventsHistory = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  openEventsTab(0);
});

//
ipc.on("set_active_events", (event, arg) => {
  if (arg != null) {
    try {
      activeEvents = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }
});

ipc.on("set_economy", function(event, arg) {
  if (arg != null) {
    try {
      economyHistory = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  if (sidebarActive == 4) {
    open_economy_tab(0);
  }
});

//
ipc.on("set_deck_changes", function(event, arg) {
  if (arg != null) {
    try {
      changes = JSON.parse(arg);
      console.log(changes);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  if (changes != null) {
    setChangesTimeline();
  }
});

//
ipc.on("set_cards", function(event, _cards, _cardsnew) {
  cards = _cards;
  cardsNew = _cardsnew;
});

//
ipc.on("set_status", function(event, arg) {
  var mainStatus = 0;
  var sp = $("<span>" + arg.status.description + "</span>");
  sp.css("text-align", "center");
  sp.css("margin-bottom", "4px");
  $(".top_status_pop").append(sp);
  arg.components.forEach(function(comp) {
    let div = $('<div class="status_item"></div>');
    let st = $('<div class="top_status_span"></div>');
    div.append("<span>" + comp.name + ":</span>");
    let sp = $("<span></span>");

    if (comp.status == "operational") {
      st.addClass("status_green");
      sp.html("Operational");
    } else if (comp.status == "degraded_performance") {
      st.addClass("status_yellow");
      if (mainStatus < 1) mainStatus = 1;
      sp.html("Degraded performance");
    } else if (comp.status == "major_outage") {
      st.addClass("status_red");
      if (mainStatus < 2) mainStatus = 2;
      sp.html("Major outage");
    } else if (comp.status == "partial_outage") {
      st.addClass("status_yellow");
      if (mainStatus < 1) mainStatus = 1;
      sp.html("Partial outage");
    } else if (comp.status == "under_maintenance") {
      st.addClass("status_yellow");
      if (mainStatus < 1) mainStatus = 1;
      sp.html("Under maintenance");
    } else {
      st.addClass("status_yellow");
      if (mainStatus < 1) mainStatus = 1;
      sp.html(comp.status);
    }
    sp.css("margin-left", "auto");
    sp.appendTo(div);
    st.appendTo(div);
    div.appendTo($(".top_status_pop"));
  });

  if (mainStatus == 0) {
    $(".top_status").addClass("status_green");
  }
  if (mainStatus == 1) {
    $(".top_status").addClass("status_yellow");
  }
  if (mainStatus == 2) {
    $(".top_status").addClass("status_red");
  }

  $(".top_status").on("mouseenter", function() {
    $(".top_status_pop").css("opacity", 1);
  });
  $(".top_status").on("mouseleave", function() {
    $(".top_status_pop").css("opacity", 0);
  });
});

//
ipc.on("set_home", function(event, arg) {
  hideLoadingBars();
  deck_tags = arg.tags;

  Object.keys(deck_tags).forEach(function(format) {
    deck_tags[format].sort(compare_archetypes);
  });
  ipc_send("set_deck_archetypes", arg.tags);
  if (sidebarActive == -1) {
    console.log("Home", arg);
    open_home_tab(arg);
  }
});

//
ipc.on("set_explore_decks", function(event, arg) {
  hideLoadingBars();
  if (sidebarActive == 3) {
    setExploreDecks(arg);
  }
});

/*//
ipc.on("set_explore", function(event, arg) {
  if (sidebarActive == 3) {
    open_explore_tab(arg, 0);
  }
});

//
ipc.on("set_ladder_decks", function(event, arg) {
  set_ladder_decks(arg);
});

//
ipc.on("set_ladder_traditional_decks", function(event, arg) {
  set_ladder_decks(arg);
});

function set_ladder_decks(arg) {
  if (sidebarActive == 3) {

    arg.decks.forEach(function(deck) {
      deck.colors = [];
      deck.colors = get_deck_colors(deck);
      deck.mainDeck.sort(compare_cards);
    });

    open_explore_tab(arg.decks, 0);
  }
}
*/

//
ipc.on("open_course_deck", function(event, arg) {
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  arg = arg.CourseDeck;
  arg.colors = get_deck_colors(arg);
  arg.mainDeck.sort(compare_cards);
  arg.sideboard.sort(compare_cards);
  console.log(arg);

  arg.mainDeck = removeDuplicates(arg.mainDeck);
  arg.sideboard = removeDuplicates(arg.sideboard);
  open_deck(arg, 1);
  hideLoadingBars();
});

//
ipc.on("set_settings", function(event, arg) {
  console.log(arg);
  settings = arg;
  cardSizePos = settings.cards_size;
  overlayAlpha = settings.overlay_alpha;
  overlayAlphaBack = settings.overlay_alpha_back;
  overlayScale = settings.overlay_scale;
  sidebarSize = settings.right_panel_width;
  if (overlayScale == undefined) {
    overlayScale = 100;
  }
  if (settings.cards_quality != undefined) {
    cardQuality = settings.cards_quality;
  }
  if (settings.back_color == undefined) {
    settings.back_color = "rgba(0,0,0,0.3)";
  }
  if (settings.back_url == undefined) {
    settings.back_url = "";
  } else {
    defaultBackground = settings.back_url;
  }
  $(".main_wrapper").css("background-color", settings.back_color);
  change_background("default");
  cardSize = 100 + cardSizePos * 10;
});

//
ipc.on("set_update_state", function(event, arg) {
  updateState = arg;

  if (sidebarActive == 9) {
    open_settings(5);
  }
});

//
ipc.on("show_notification", function(event, arg) {
  $(".notification").show();
  $(".notification").attr("title", arg);

  if (arg == "Update available" || arg == "Update downloaded") {
    $(".notification").click(function() {
      force_open_about();
    });
  }
});

//
ipc.on("hide_notification", function() {
  $(".notification").hide();
  $(".notification").attr("title", "");
});

//
ipc.on("force_open_settings", function() {
  force_open_settings();
});

//
ipc.on("force_open_about", function() {
  force_open_about();
});

//
ipc.on("prefill_auth_form", function(event, arg) {
  document.getElementById("rememberme").checked = arg.remember_me;
  document.getElementById("signin_user").value = arg.username;
  document.getElementById("signin_pass").value = arg.password;
});

//
function rememberMe() {
  const rSettings = {
    remember_me: document.getElementById("rememberme").checked
  };
  ipc_send("save_app_settings", rSettings);
}

//
ipc.on("initialize", function() {
  $(".top_username").html(playerData.name.slice(0, -6));
  $(".top_username_id").html(playerData.name.slice(-6));

  sidebarActive = -1;
  showLoadingBars();
  ipc_send("request_home", "");
  $(".top_nav").removeClass("hidden");
  $(".overflow_ux").removeClass("hidden");
  $(".message_center").css("display", "none");
  $(".init_loading").hide();
});

//
var logDialogOpen = false;
ipc.on("no_log", function(event, arg) {
  if (loggedIn) {
    $(".top_nav").addClass("hidden");
    $(".overflow_ux").addClass("hidden");
    $(".message_center").css("display", "flex");
    $(".message_center").html(
      '<div class="message_big red">No Log Found</div><div class="message_sub_16 white">check if it exists at ' +
        arg +
        '</div><div class="message_sub_16 white">if it does, try closing MTG Arena and deleting it.</div>'
    );
  } else if (!logDialogOpen) {
    logDialogOpen = true;
    $(".dialog_wrapper").css("opacity", 1);
    $(".dialog_wrapper").css("pointer-events", "all");
    $(".dialog_wrapper").show();
    $(".dialog").css("width", "600px");
    $(".dialog").css("height", "200px");
    $(".dialog").css("top", "calc(50% - 100px)");

    $(".dialog_wrapper").on("click", function() {
      console.log(".dialog_wrapper on click");
      //e.stopPropagation();
      $(".dialog_wrapper").css("opacity", 0);
      $(".dialog_wrapper").css("pointer-events", "none");
      setTimeout(function() {
        logDialogOpen = false;
        $(".dialog_wrapper").hide();
        $(".dialog").css("width", "500px");
        $(".dialog").css("height", "160px");
        $(".dialog").css("top", "calc(50% - 80px)");
      }, 250);
    });

    $(".dialog").on("click", function(e) {
      e.stopPropagation();
      console.log(".dialog on click");
    });

    var dialog = $(".dialog");
    dialog.html("");

    var cont = $('<div class="dialog_container"></div>');

    cont.append(
      '<div class="share_title">Enter output_log.txt location:</div>'
    );
    var icd = $('<div class="share_input_container"></div>');
    var sin = $(
      '<input style="border-radius: 3px; height: 28px;font-size: 14px;" id="log_input" autofocus autocomplete="off" value="' +
        arg +
        '" />'
    );
    var but = $('<div class="button_simple">Save</div>');

    sin.appendTo(icd);
    icd.appendTo(cont);

    cont.appendTo(dialog);
    but.appendTo(dialog);

    but.click(function() {
      ipc_send("set_log", document.getElementById("log_input").value);
      console.log(".dialog_wrapper on click");
      //e.stopPropagation();
      $(".dialog_wrapper").css("opacity", 0);
      $(".dialog_wrapper").css("pointer-events", "none");
      setTimeout(function() {
        logDialogOpen = false;
        $(".dialog_wrapper").hide();
        $(".dialog").css("width", "500px");
        $(".dialog").css("height", "160px");
        $(".dialog").css("top", "calc(50% - 80px)");
      }, 250);
    });
  }
});

ipc.on("log_ok", function() {
  logDialogOpen = false;
  $(".dialog_wrapper").css("opacity", 0);
  $(".dialog_wrapper").css("pointer-events", "none");
  setTimeout(function() {
    $(".dialog_wrapper").hide();
    $(".dialog").css("width", "500px");
    $(".dialog").css("height", "160px");
    $(".dialog").css("top", "calc(50% - 80px)");
  }, 250);
});

//
ipc.on("set_offline", (_event, arg) => {
  offlineMode = arg;
});

//
ipc.on("offline", function() {
  showOfflineSplash();
});

function showOfflineSplash() {
  hideLoadingBars();
  $("#ux_0").html(
    '<div class="message_center" style="display: flex; position: fixed;"><div class="message_unlink"></div><div class="message_big red">Oops, you are offline!</div><div class="message_sub_16 white">You can <a class="signup_link">sign up</a> to access online features.</div></div>'
  );
  $(".signup_link").click(function() {
    shell.openExternal("https://mtgatool.com/signup/");
  });
}

//
ipc.on("log_read", function() {
  if ($(".top_nav").hasClass("hidden")) {
    $(".top_nav").removeClass("hidden");
    $(".overflow_ux").removeClass("hidden");
    $(".message_center").css("display", "none");
  }
});

$(".list_deck").on("mouseenter mouseleave", function(e) {
  $(".deck_tile").trigger(e.type);
});

//
ipc.on("popup", function(event, arg, time) {
  pop(arg, time);
});

var popTimeout = null;
function pop(str, timeout) {
  $(".popup").css("opacity", 1);
  $(".popup").html(str);
  if (popTimeout != null) {
    clearTimeout(popTimeout);
  }
  if (timeout < 1) {
    popTimeout = null;
  } else {
    popTimeout = setTimeout(function() {
      $(".popup").css("opacity", 0);
      popTimeout = null;
    }, timeout);
  }
}

function installUpdate() {
  ipc_send("renderer_update_install", 1);
}

function force_open_settings() {
  sidebarActive = 6;
  $(".top_nav_item").each(function() {
    $(this).removeClass("item_selected");
    if ($(this).hasClass("it6")) {
      $(this).addClass("item_selected");
    }
  });
  $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  open_settings(lastSettingsSection);
}

function force_open_about() {
  sidebarActive = 9;
  $(".top_nav_item").each(function() {
    $(this).removeClass("item_selected");
    if ($(this).hasClass("it7")) {
      $(this).addClass("item_selected");
    }
  });
  $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  open_settings(5);
}

let top_compact = false;
let resizeTimer;
window.addEventListener("resize", event => {
  hideLoadingBars();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if ($(".top_nav_icons").width() < 500) {
      if (!top_compact) {
        $("span.top_nav_item_text").css("opacity", 0);
        $(".top_nav_icon").css("display", "block");
        $(".top_nav_icon").css("opacity", 1);
        top_compact = true;
      }
    } else {
      if (top_compact) {
        $("span.top_nav_item_text").css("opacity", 1);
        $(".top_nav_icon").css("opacity", 0);
        window.setTimeout(() => {
          $(".top_nav_icon").css("display", false);
        }, 500);
        top_compact = false;
      }
    }
  }, 100);
});

$(document).ready(function() {
  $(".signup_link").click(function() {
    shell.openExternal("https://mtgatool.com/signup/");
  });

  $(".offline_link").click(function() {
    ipc_send("login", { username: "", password: "" });
    $(".unlink").show();
  });

  $(".forgot_link").click(function() {
    shell.openExternal("https://mtgatool.com/resetpassword/");
  });

  function submitAuthenticateForm() {
    if (canLogin) {
      var user = document.getElementById("signin_user").value;
      var pass = document.getElementById("signin_pass").value;
      if (pass != HIDDEN_PW) {
        pass = sha1(pass);
      }
      ipc_send("login", { username: user, password: pass });
      canLogin = false;
    }
  }

  $("#authenticate_form").on("submit", e => {
    e.preventDefault();
    submitAuthenticateForm();
  });

  $(".login_link").click(submitAuthenticateForm);

  //
  $(".close").click(function() {
    ipc_send("renderer_window_close", 1);
  });

  //
  $(".minimize").click(function() {
    ipc_send("renderer_window_minimize", 1);
  });

  //
  $(".settings").click(function() {
    force_open_settings();
  });

  //
  $(".top_nav_item").click(function() {
    $("#ux_0").off();
    $("#ux_0")[0].removeEventListener("scroll", () => {}, false);
    $("#history_column").off();
    change_background("default");
    document.body.style.cursor = "auto";
    if (!$(this).hasClass("item_selected")) {
      $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");

      $(".top_nav_item").each(function() {
        $(this).removeClass("item_selected");
      });

      $(this).addClass("item_selected");
      $("#ux_0").html("");
      showLoadingBars();

      if ($(this).hasClass("ith")) {
        sidebarActive = -1;
        if (offlineMode) {
          showOfflineSplash();
        } else {
          if (discordTag == null) {
            open_home_tab(null, true);
          } else {
            ipc_send("request_home", filteredWildcardsSet);
          }
        }
      }
      if ($(this).hasClass("it0")) {
        sidebarActive = 0;
        open_decks_tab();
      }
      if ($(this).hasClass("it1")) {
        sidebarActive = 1;
        ipc_send("request_history", 1);
      }
      if ($(this).hasClass("it2")) {
        sidebarActive = 2;
        ipc_send("request_events", 1);
      }
      if ($(this).hasClass("it3")) {
        sidebarActive = 3;
        if (offlineMode) {
          showOfflineSplash();
        } else {
          openExploreTab();
        }
      }
      if ($(this).hasClass("it4")) {
        sidebarActive = 4;
        ipc_send("request_economy", 1);
      }
      if ($(this).hasClass("it5")) {
        sidebarActive = 5;
        openCollectionTab();
      }
      if ($(this).hasClass("it6")) {
        sidebarActive = 6;
        open_settings(lastSettingsSection);
      }
      if ($(this).hasClass("it7")) {
        sidebarActive = 1;
        setFilters({
          ...Aggregator.getDefaultFilters(),
          date: DATE_SEASON,
          eventId: RANKED_CONST,
          rankedMode: true
        });
        ipc_send("request_history", 1);
        $(this).removeClass("item_selected");
        $(".it1").addClass("item_selected");
      }
      if ($(this).hasClass("it8")) {
        sidebarActive = 1;
        setFilters({
          ...Aggregator.getDefaultFilters(),
          date: DATE_SEASON,
          eventId: RANKED_DRAFT,
          rankedMode: true
        });
        ipc_send("request_history", 1);
        $(this).removeClass("item_selected");
        $(".it1").addClass("item_selected");
      }
    } else {
      $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
    }
  });
});

function showLoadingBars() {
  $$(".main_loading")[0].style.display = "block";
  document.body.style.cursor = "progress";
}

//
ipc.on("show_loading", () => showLoadingBars());

function hideLoadingBars() {
  $$(".main_loading")[0].style.display = "none";
  document.body.style.cursor = "auto";
}

//
ipc.on("hide_loading", () => hideLoadingBars());

//
ipc.on("set_draft_link", function(event, arg) {
  hideLoadingBars();
  document.getElementById("share_input").value = arg;
});

//
function addHover(_match, tileGrpid) {
  $("." + _match.id).on("mouseenter", function() {
    $("." + _match.id + "t").css("opacity", 1);
    $("." + _match.id + "t").css("width", "200px");
  });

  $("." + _match.id).on("mouseleave", function() {
    $("." + _match.id + "t").css("opacity", 0.66);
    $("." + _match.id + "t").css("width", "128px");
  });

  $("." + _match.id).on("click", function() {
    if (_match.type == "match") {
      open_match(_match.id);
      $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
    } else if (_match.type == "draft") {
      draftPosition = 1;
      open_draft(_match.id, tileGrpid, _match.set);
      $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
    } else if (_match.type == "Event") {
      expandEvent(_match, tileGrpid);
    }
  });
}

//
ipc.on("tou_set", function(event, arg) {
  document.body.style.cursor = "auto";
  tournamentOpen(arg);
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
});

//
function makeResizable(div, resizeCallback, finalCallback) {
  var m_pos;
  let finalWidth;

  let resize = function(e) {
    var parent = div.parentNode;
    var dx = m_pos - e.x;
    m_pos = e.x;
    let newWidth = Math.max(10, parseInt(parent.style.width) + dx);
    sidebarSize = newWidth;
    parent.style.width = `${newWidth}px`;
    parent.style.flex = `0 0 ${newWidth}px`;
    if (resizeCallback instanceof Function) resizeCallback(newWidth);
    finalWidth = newWidth;
  };

  div.addEventListener(
    "mousedown",
    event => {
      m_pos = event.x;
      document.addEventListener("mousemove", resize, false);
    },
    false
  );

  document.addEventListener(
    "mouseup",
    event => {
      document.removeEventListener("mousemove", resize, false);
      if (finalWidth && finalCallback instanceof Function) {
        finalCallback(finalWidth);
        finalWidth = null;
      }
    },
    false
  );
}

//
function drawDeck(div, deck, showWildcards = false) {
  var unique = makeId(4);
  div.html("");
  var prevIndex = 0;
  deck.mainDeck.forEach(function(card) {
    let grpId = card.id;
    let type = cardsDb.get(grpId).type;
    let cardTypeSort = get_card_type_sort(type);
    if (prevIndex == 0) {
      let q = deck_count_types(deck, type, false);
      addCardSeparator(cardTypeSort, div, q);
    } else if (prevIndex != 0) {
      if (cardTypeSort != get_card_type_sort(cardsDb.get(prevIndex).type)) {
        let q = deck_count_types(deck, type, false);
        addCardSeparator(cardTypeSort, div, q);
      }
    }

    if (card.quantity > 0) {
      addCardTile(
        grpId,
        unique + "a",
        card.quantity,
        div,
        showWildcards,
        deck,
        false
      );
    }

    prevIndex = grpId;
  });

  if (deck.sideboard != undefined) {
    if (deck.sideboard.length > 0) {
      addCardSeparator(99, div, deck.sideboard.sum("quantity"));
      prevIndex = 0;
      deck.sideboard.forEach(function(card) {
        var grpId = card.id;
        //var type = cardsDb.get(grpId).type;
        if (card.quantity > 0) {
          addCardTile(
            grpId,
            unique + "b",
            card.quantity,
            div,
            showWildcards,
            deck,
            true
          );
        }
      });
    }
  }
}

//
function drawCardList(div, cards) {
  let unique = makeId(4);
  let counts = {};
  cards.forEach(cardId => (counts[cardId] = (counts[cardId] || 0) + 1));
  Object.keys(counts).forEach(cardId =>
    addCardTile(cardId, unique, counts[cardId], div)
  );
}

//
function drawDeckVisual(_div, _stats, deck) {
  // PLACEHOLDER
  if (!(_div instanceof jQuery)) {
    _div = $(_div);
  }
  // attempt at sorting visually..
  var newMainDeck = [];

  for (var cmc = 0; cmc < 21; cmc++) {
    for (var qq = 4; qq > -1; qq--) {
      deck.mainDeck.forEach(function(c) {
        var grpId = c.id;
        var card = cardsDb.get(grpId);
        var quantity;
        if (card.type.indexOf("Land") == -1 && grpId != 67306) {
          if (card.cmc == cmc) {
            quantity = c.quantity;

            if (quantity == qq) {
              newMainDeck.push(c);
            }
          }
        } else if (cmc == 20) {
          quantity = c.quantity;
          if (qq == 0 && quantity > 4) {
            newMainDeck.push(c);
          }
          if (quantity == qq) {
            newMainDeck.push(c);
          }
        }
      });
    }
  }

  var types = get_deck_types_ammount(deck);
  var typesdiv = $('<div class="types_container"></div>');
  $(
    '<div class="type_icon_cont"><div title="Creatures" class="type_icon type_cre"></div><span>' +
      types.cre +
      "</span></div>"
  ).appendTo(typesdiv);
  $(
    '<div class="type_icon_cont"><div title="Lands" class="type_icon type_lan"></div><span>' +
      types.lan +
      "</span></div>"
  ).appendTo(typesdiv);
  $(
    '<div class="type_icon_cont"><div title="Instants" class="type_icon type_ins"></div><span>' +
      types.ins +
      "</span></div>"
  ).appendTo(typesdiv);
  $(
    '<div class="type_icon_cont"><div title="Sorceries" class="type_icon type_sor"></div><span>' +
      types.sor +
      "</span></div>"
  ).appendTo(typesdiv);
  $(
    '<div class="type_icon_cont"><div title="Enchantments" class="type_icon type_enc"></div><span>' +
      types.enc +
      "</span></div>"
  ).appendTo(typesdiv);
  $(
    '<div class="type_icon_cont"><div title="Artifacts" class="type_icon type_art"></div><span>' +
      types.art +
      "</span></div>"
  ).appendTo(typesdiv);
  $(
    '<div class="type_icon_cont"><div title="Planeswalkers" class="type_icon type_pla"></div><span>' +
      types.pla +
      "</span></div>"
  ).appendTo(typesdiv);
  typesdiv.prependTo(_div.parent());

  if (_stats) {
    _stats.hide();
  }
  _div.css("display", "flex");
  _div.css("width", "auto");
  _div.css("margin", "0 auto");
  _div.html("");

  _div.parent().css("flex-direction", "column");

  if (_stats) {
    $('<div class="button_simple openDeck">Normal view</div>').appendTo(
      _div.parent()
    );

    $(".openDeck").click(function() {
      open_deck(-1, 2);
    });
  }

  var sz = cardSize;
  let div = $('<div class="visual_mainboard"></div>');
  div.css("display", "flex");
  div.css("flex-wrap", "wrap");
  div.css("align-content", "start");
  div.css("max-width", (sz + 6) * 5 + "px");
  div.appendTo(_div);

  //var unique = makeId(4);
  //var prevIndex = 0;

  var tileNow;
  var _n = 0;
  newMainDeck.forEach(function(c) {
    var grpId = c.id;
    var card = cardsDb.get(grpId);

    if (c.quantity > 0) {
      let dfc = "";
      if (card.dfc == "DFC_Back") dfc = "a";
      if (card.dfc == "DFC_Front") dfc = "b";
      if (card.dfc == "SplitHalf") dfc = "a";
      if (dfc != "b") {
        for (let i = 0; i < c.quantity; i++) {
          if (_n % 4 == 0) {
            tileNow = $('<div class="deck_visual_tile"></div>');
            tileNow.appendTo(div);
          }

          let d = $(
            '<div style="width: ' +
              sz +
              'px !important;" class="deck_visual_card"></div>'
          );
          let img = $(
            '<img style="width: ' +
              sz +
              'px !important;" class="deck_visual_card_img"></img>'
          );

          img.attr("src", get_card_image(card));
          img.appendTo(d);
          d.appendTo(tileNow);

          addCardHover(img, card);
          _n++;
        }
      }
    }
  });

  div = $('<div class="visual_sideboard"></div>');
  div.css("display", "flex");
  div.css("flex-wrap", "wrap");
  div.css("margin-left", "32px");
  div.css("align-content", "start");
  div.css("max-width", (sz + 6) * 1.5 + "px");
  div.appendTo(_div);

  if (deck.sideboard != undefined) {
    tileNow = $('<div class="deck_visual_tile_side"></div>');
    tileNow.css("width", (sz + 6) * 5 + "px");
    tileNow.appendTo(div);

    if (deck.sideboard.length == 0) {
      tileNow.css("display", "none");
    }

    _n = 0;
    deck.sideboard.forEach(function(c) {
      var grpId = c.id;
      var card = cardsDb.get(grpId);
      if (c.quantity > 0) {
        let dfc = "";
        if (card.dfc == "DFC_Back") dfc = "a";
        if (card.dfc == "DFC_Front") dfc = "b";
        if (card.dfc == "SplitHalf") dfc = "a";
        if (dfc != "b") {
          for (let i = 0; i < c.quantity; i++) {
            var d;
            if (_n % 2 == 1) {
              d = $(
                '<div style="width: ' +
                  sz +
                  'px !important;" class="deck_visual_card_side"></div>'
              );
            } else {
              d = $(
                '<div style="margin-left: 60px; width: ' +
                  sz +
                  'px !important;" class="deck_visual_card_side"></div>'
              );
            }
            let img = $(
              '<img style="width: ' +
                sz +
                'px !important;" class="deck_visual_card_img"></img>'
            );
            img.attr("src", get_card_image(card));
            img.appendTo(d);
            d.appendTo(tileNow);

            addCardHover(img, card);
            _n++;
          }
        }
      }
    });
  }
}

//
function setChangesTimeline() {
  var cont = $(".stats");
  cont.html("");

  var time = $('<div class="changes_timeline"></div>');

  changes.sort(compare_changes);

  // CURRENT DECK
  let div = $('<div class="change"></div>');
  let butbox = $(
    '<div class="change_button_cont" style="transform: scaleY(-1);"></div>'
  );
  let button = $('<div class="change_button"></div>');
  button.appendTo(butbox);
  let datbox = $('<div class="change_data"></div>');

  // title
  let title = $('<div class="change_data_box"></div>');
  title.html("Current Deck");

  butbox.appendTo(div);
  datbox.appendTo(div);
  title.appendTo(datbox);
  div.appendTo(time);

  butbox.on("mouseenter", function() {
    button.css("width", "32px");
    button.css("height", "32px");
    button.css("top", "calc(50% - 16px)");
  });

  butbox.on("mouseleave", function() {
    button.css("width", "24px");
    button.css("height", "24px");
    button.css("top", "calc(50% - 12px)");
  });

  butbox.on("click", function() {
    var hasc = button.hasClass("change_button_active");

    $(".change_data_box_inside").each(function() {
      $(this).css("height", "0px");
    });

    $(".change_button").each(function() {
      $(this).removeClass("change_button_active");
    });

    if (!hasc) {
      button.addClass("change_button_active");
    }
  });
  //

  var cn = 0;
  changes.forEach(function(change) {
    change.changesMain.sort(compare_changes_inner);
    change.changesSide.sort(compare_changes_inner);

    let div = $('<div class="change"></div>');
    let butbox;
    if (cn < changes.length - 1) {
      butbox = $(
        '<div style="background-size: 100% 100% !important;" class="change_button_cont"></div>'
      );
    } else {
      butbox = $('<div class="change_button_cont"></div>');
    }
    var button = $('<div class="change_button"></div>');
    button.appendTo(butbox);
    let datbox = $('<div class="change_data"></div>');

    // title
    let title = $('<div class="change_data_box"></div>');
    // inside
    let data = $('<div class="change_data_box_inside"></div>');
    var innherH = 54;
    let nc = 0;
    if (change.changesMain.length > 0) {
      let dd = $('<div class="change_item_box"></div>');
      addCardSeparator(98, dd);
      dd.appendTo(data);
    }

    change.changesMain.forEach(function(c) {
      innherH += 30;
      if (c.quantity > 0) nc += c.quantity;
      let dd = $('<div class="change_item_box"></div>');
      if (c.quantity > 0) {
        let ic = $('<div class="change_add"></div>');
        ic.appendTo(dd);
      } else {
        let ic = $('<div class="change_remove"></div>');
        ic.appendTo(dd);
      }

      addCardTile(c.id, "chm" + cn, Math.abs(c.quantity), dd);
      dd.appendTo(data);
    });

    if (change.changesSide.length > 0) {
      let dd = $('<div class="change_item_box"></div>');
      addCardSeparator(99, dd);
      innherH += 30;
      dd.appendTo(data);
    }

    change.changesSide.forEach(function(c) {
      innherH += 30;
      if (c.quantity > 0) nc += c.quantity;
      let dd = $('<div class="change_item_box"></div>');
      if (c.quantity > 0) {
        let ic = $('<div class="change_add"></div>');
        ic.appendTo(dd);
      } else {
        let ic = $('<div class="change_remove"></div>');
        ic.appendTo(dd);
      }

      addCardTile(c.id, "chs" + cn, Math.abs(c.quantity), dd);
      dd.appendTo(data);
    });

    title.html(
      nc + " changes, " + timeSince(Date.parse(change.date)) + " ago."
    );

    butbox.appendTo(div);
    datbox.appendTo(div);
    title.appendTo(datbox);
    data.appendTo(datbox);
    div.appendTo(time);

    butbox.on("mouseenter", function() {
      button.css("width", "32px");
      button.css("height", "32px");
      button.css("top", "calc(50% - 16px)");
    });

    butbox.on("mouseleave", function() {
      button.css("width", "24px");
      button.css("height", "24px");
      button.css("top", "calc(50% - 12px)");
    });

    butbox.on("click", function() {
      // This requires some UX indicators
      //drawDeck($('.decklist'), {mainDeck: change.previousMain, sideboard: change.previousSide});
      var hasc = button.hasClass("change_button_active");

      $(".change_data_box_inside").each(function() {
        $(this).css("height", "0px");
      });

      $(".change_button").each(function() {
        $(this).removeClass("change_button_active");
      });

      if (!hasc) {
        button.addClass("change_button_active");
        data.css("height", innherH + "px");
      }
    });

    cn++;
  });

  $('<div class="button_simple openDeck">View stats</div>').appendTo(cont);

  $(".openDeck").click(function() {
    open_deck(-1, 2);
  });
  time.appendTo(cont);
}

//
function open_draft(id, tileGrpid, set) {
  console.log("OPEN DRAFT", id, draftPosition);
  $("#ux_1").html("");
  var draft = matchesHistory[id];

  if (draftPosition < 1) draftPosition = 1;
  if (draftPosition > packSize * 6) draftPosition = packSize * 6;

  var packSize = 14;
  if (draft.set == "Guilds of Ravnica" || draft.set == "Ravnica Allegiance") {
    packSize = 15;
  }

  var pa = Math.floor((draftPosition - 1) / 2 / packSize);
  var pi = Math.floor(((draftPosition - 1) / 2) % packSize);
  var key = "pack_" + pa + "pick_" + pi;

  var pack = (draft[key] && draft[key].pack) || [];
  var pick = (draft[key] && draft[key].pick) || "";

  var top = $(
    '<div class="decklist_top"><div class="button back"></div><div class="deck_name">' +
      set +
      " Draft</div></div>"
  );
  let flr = $('<div class="deck_top_colors"></div>');
  top.append(flr);

  if (cardsDb.get(tileGrpid)) {
    change_background("", tileGrpid);
  }

  var cont = $('<div class="flex_item" style="flex-direction: column;"></div>');
  cont.append(
    '<div class="draft_nav_container"><div class="draft_nav_prev"></div><div class="draft_nav_next"></div></div>'
  );

  $(
    '<div class="draft_title">Pack ' +
      (pa + 1) +
      ", Pick " +
      (pi + 1) +
      "</div>"
  ).appendTo(cont);

  var slider = $('<div class="slidecontainer"></div>');
  slider.appendTo(cont);
  var sliderInput = $(
    '<input type="range" min="1" max="' +
      packSize * 6 +
      '" value="' +
      draftPosition +
      '" class="slider" id="myRange">'
  );
  sliderInput.appendTo(slider);

  var pd = $('<div class="draft_pack_container"></div>');
  pd.appendTo(cont);

  pack.forEach(function(grpId) {
    var d = $(
      '<div style="width: ' +
        cardSize +
        'px !important;" class="draft_card"></div>'
    );
    var img = $(
      '<img style="width: ' +
        cardSize +
        'px !important;" class="draft_card_img"></img>'
    );
    if (grpId == pick && draftPosition % 2 == 0) {
      img.addClass("draft_card_picked");
    }
    var card = cardsDb.get(grpId);
    img.attr("src", get_card_image(card));

    img.appendTo(d);
    var r = $(
      '<div style="" class="draft_card_rating">' +
        draftRanks[card.rank] +
        "</div>"
    );
    r.appendTo(d);
    addCardHover(img, card);
    d.appendTo(pd);
  });

  $("#ux_1").append(top);
  $("#ux_1").append(cont);

  var qSel = document.querySelector("input");

  $(".draft_nav_prev").off();
  $(".draft_nav_next").off();
  $(".slider").off();

  $(".slider").on("click mousemove", function() {
    var pa = Math.floor((qSel.value - 1) / 2 / packSize);
    var pi = Math.floor(((qSel.value - 1) / 2) % packSize);
    $(".draft_title").html("Pack " + (pa + 1) + ", Pick " + (pi + 1));
  });

  $(".slider").on("click mouseup", function() {
    draftPosition = parseInt(qSel.value);
    open_draft(id, tileGrpid, set);
  });

  $(".draft_nav_prev").on("click mouseup", function() {
    draftPosition -= 1;
    open_draft(id, tileGrpid, set);
  });

  $(".draft_nav_next").on("click mouseup", function() {
    draftPosition += 1;
    open_draft(id, tileGrpid, set);
  });
  //
  $(".back").click(function() {
    change_background("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

function open_match(id) {
  $("#ux_1").html("");
  var match = matchesHistory[id];

  let top = $(
    '<div class="decklist_top"><div class="button back"></div><div class="deck_name">' +
      match.playerDeck.name +
      "</div></div>"
  );
  let flr = $('<div class="deck_top_colors"></div>');

  if (match.playerDeck.colors != undefined) {
    match.playerDeck.colors.forEach(function(color) {
      var m = $('<div class="mana_s20 mana_' + mana[color] + '"></div>');
      flr.append(m);
    });
  }
  top.append(flr);

  var flc = $(
    '<div class="flex_item" style="justify-content: space-evenly;"></div>'
  );
  if (fs.existsSync(path.join(actionLogDir, id + ".txt"))) {
    $('<div class="button_simple openLog">Action log</div>').appendTo(flc);
  }

  var tileGrpid = match.playerDeck.deckTileId;
  if (cardsDb.get(tileGrpid)) {
    change_background("", tileGrpid);
  }
  var fld = $('<div class="flex_item"></div>');

  // this is a mess
  var flt = $('<div class="flex_item"></div>');
  var fltl = $('<div class="flex_item"></div>');
  var r = $('<div class="rank"></div>');
  r.appendTo(fltl);

  var fltr = $('<div class="flex_item"></div>');
  fltr.css("flex-direction", "column");
  var fltrt = $('<div class="flex_top"></div>');
  var fltrb = $('<div class="flex_bottom"></div>');
  fltrt.appendTo(fltr);
  fltrb.appendTo(fltr);

  fltl.appendTo(flt);
  fltr.appendTo(flt);

  var rank = match.player.rank;
  var tier = match.player.tier;
  r.css(
    "background-position",
    get_rank_index(rank, tier) * -48 + "px 0px"
  ).attr("title", rank + " " + tier);

  var name = $(
    '<div class="list_match_player_left">' +
      match.player.name.slice(0, -6) +
      " (" +
      match.player.win +
      ")</div>"
  );
  name.appendTo(fltrt);

  if (match.player.win > match.opponent.win) {
    var w = $('<div class="list_match_player_left green">Winner</div>');
    w.appendTo(fltrb);
  }

  var dl = $('<div class="decklist"></div>');
  flt.appendTo(dl);

  drawDeck(dl, match.playerDeck);

  $(
    '<div class="button_simple centered exportDeckPlayer">Export to Arena</div>'
  ).appendTo(dl);
  $(
    '<div class="button_simple centered exportDeckStandardPlayer">Export to .txt</div>'
  ).appendTo(dl);

  flt = $('<div class="flex_item" style="flex-direction: row-reverse;"></div>');
  fltl = $('<div class="flex_item"></div>');
  r = $('<div class="rank"></div>');
  r.appendTo(fltl);

  fltr = $('<div class="flex_item"></div>');
  fltr.css("flex-direction", "column");
  fltr.css("align-items", "flex-end");
  fltrt = $('<div class="flex_top"></div>');
  fltrb = $('<div class="flex_bottom"></div>');
  fltrt.appendTo(fltr);
  fltrb.appendTo(fltr);

  fltl.appendTo(flt);
  fltr.appendTo(flt);

  rank = match.opponent.rank;
  tier = match.opponent.tier;
  r.css(
    "background-position",
    get_rank_index(rank, tier) * -48 + "px 0px"
  ).attr("title", rank + " " + tier);

  name = $(
    '<div class="list_match_player_right">' +
      match.opponent.name.slice(0, -6) +
      " (" +
      match.opponent.win +
      ")</div>"
  );
  name.appendTo(fltrt);

  if (match.player.win < match.opponent.win) {
    w = $('<div class="list_match_player_right green">Winner</div>');
    w.appendTo(fltrb);
  }

  var odl = $('<div class="decklist"></div>');
  flt.appendTo(odl);

  match.oppDeck.mainDeck.sort(compare_cards);
  match.oppDeck.sideboard.sort(compare_cards);
  /*
  match.oppDeck.mainDeck.forEach(function(c) {
    c.quantity = 9999;
  });
  match.oppDeck.sideboard.forEach(function(c) {
    c.quantity = 9999;
  });
  */
  drawDeck(odl, match.oppDeck);

  $(
    '<div class="button_simple centered exportDeck">Export to Arena</div>'
  ).appendTo(odl);
  $(
    '<div class="button_simple centered exportDeckStandard">Export to .txt</div>'
  ).appendTo(odl);

  dl.appendTo(fld);
  odl.appendTo(fld);

  $("#ux_1").append(top);
  $("#ux_1").append(flc);
  $("#ux_1").append(fld);

  if (match.gameStats) {
    match.gameStats.forEach((game, gameIndex) => {
      if (game.sideboardChanges) {
        addCardSeparator(
          "Game " + (gameIndex + 1) + " Sideboard Changes",
          $("#ux_1")
        );
        let sideboardDiv = $('<div class="card_lists_list"></div>');
        let additionsDiv = $('<div class="cardlist"></div>');
        if (
          game.sideboardChanges.added.length == 0 &&
          game.sideboardChanges.removed.length == 0
        ) {
          addCardSeparator("No changes", additionsDiv);
          additionsDiv.appendTo(sideboardDiv);
        } else {
          addCardSeparator("Sideboarded In", additionsDiv);
          drawCardList(additionsDiv, game.sideboardChanges.added);
          additionsDiv.appendTo(sideboardDiv);
          let removalsDiv = $('<div class="cardlist"></div>');
          addCardSeparator("Sideboarded Out", removalsDiv);
          drawCardList(removalsDiv, game.sideboardChanges.removed);
          removalsDiv.appendTo(sideboardDiv);
        }

        $("#ux_1").append(sideboardDiv);
      }

      addCardSeparator("Game " + (gameIndex + 1) + " Hands Drawn", $("#ux_1"));

      let handsDiv = $('<div class="card_lists_list"></div>');
      if (game.handsDrawn.length > 3) {
        // The default value of "center" apparently causes padding to be omitted in the calculation of how far
        // the scrolling should go. So, if there are enough hands to actually need scrolling, override it.
        handsDiv.css("justify-content", "start");
      }

      game.handsDrawn.forEach((hand, i) => {
        let handDiv = $('<div class="cardlist"></div>');
        drawCardList(handDiv, hand);
        handDiv.appendTo(handsDiv);
        if (game.bestOf == 1 && i == 0) {
          let landDiv = $(
            '<div style="margin: auto; text-align: center;" tooltip-top tooltip-content=' +
              '"This hand was drawn with weighted odds that Wizards of the Coast has not disclosed because it is the first hand in a best-of-one match. ' +
              'It should be more likely to have a close to average number of lands, but only they could calculate the exact odds.">Land Percentile: Unknown</div>'
          );
          landDiv.appendTo(handDiv);
        } else {
          let likelihood = hypergeometricSignificance(
            game.handLands[i],
            game.deckSize,
            hand.length,
            game.landsInDeck
          );
          let landDiv = $(
            '<div style="margin: auto; text-align: center;" tooltip-top tooltip-content=' +
              '"The probability of a random hand of the same size having a number of lands at least as far from average as this one, ' +
              'calculated as if the distribution were continuous. Over a large number of games, this should average about 50%.">Land Likelihood: ' +
              (likelihood * 100).toFixed(2) +
              "%</div>"
          );
          landDiv.appendTo(handDiv);
        }
      });

      $("#ux_1").append(handsDiv);

      addCardSeparator(
        "Game " + (gameIndex + 1) + " Shuffled Order",
        $("#ux_1")
      );
      let libraryDiv = $('<div class="library_list"></div>');
      let unique = makeId(4);
      let handSize = 8 - game.handsDrawn.length;

      game.shuffledOrder.forEach((cardId, libraryIndex) => {
        let rowShade =
          libraryIndex === handSize - 1
            ? "line_dark line_bottom_border"
            : libraryIndex < handSize - 1
            ? "line_dark"
            : (libraryIndex - handSize) % 2 === 0
            ? "line_light"
            : "line_dark";
        let cardDiv = $(`<div class="library_card ${rowShade}"></div>`);
        addCardTile(
          cardId,
          unique + libraryIndex,
          "#" + (libraryIndex + 1),
          cardDiv
        );
        cardDiv.appendTo(libraryDiv);
      });
      let unknownCards = game.deckSize - game.shuffledOrder.length;
      if (unknownCards > 0) {
        let cardDiv = $('<div class="library_card"></div>');
        addCardTile(null, unique + game.deckSize, unknownCards + "x", cardDiv);
        cardDiv.appendTo(libraryDiv);
      }

      let handExplanation = $(
        '<div class="library_hand">The opening hand is excluded from the below statistics to prevent mulligan choices from influencing them.</div>'
      );
      handExplanation.css("grid-row-end", "span " + (handSize - 1));
      handExplanation.appendTo(libraryDiv);

      let headerDiv = $(
        '<div class="library_header" tooltip-bottom tooltip-content="The number of lands in the library at or before this point.">Lands</div>'
      );
      headerDiv.css("grid-area", handSize + " / 2");
      headerDiv.appendTo(libraryDiv);
      headerDiv = $(
        '<div class="library_header" tooltip-bottom tooltip-content="The average number of lands expected in the library at or before this point.">Expected</div>'
      );
      headerDiv.css("grid-area", handSize + " / 3");
      headerDiv.appendTo(libraryDiv);
      headerDiv = $(
        '<div class="library_header" tooltip-bottom tooltip-content="The probability of the number of lands being at least this far from average, calculated as if the distribution were continuous. For details see footnote. Over a large number of games, this should average about 50%.">Likelihood</div>'
      );
      headerDiv.css("grid-area", handSize + " / 4");
      headerDiv.appendTo(libraryDiv);
      headerDiv = $(
        '<div class="library_header" tooltip-bottomright tooltip-content="The expected percentage of games where the actual number of lands is equal or less than this one. This is easier to calculate and more widely recognized but harder to assess the meaning of.">Percentile</div>'
      );
      headerDiv.css("grid-area", handSize + " / 5");
      headerDiv.appendTo(libraryDiv);

      game.libraryLands.forEach((count, index) => {
        let rowShade = index % 2 === 0 ? "line_light" : "line_dark";
        let landsDiv = $(
          `<div class="library_stat ${rowShade}">${count}</div>`
        );
        landsDiv.css("grid-area", handSize + index + 1 + " / 2");
        landsDiv.appendTo(libraryDiv);
        let expected = (
          ((index + 1) * game.landsInLibrary) /
          game.librarySize
        ).toFixed(2);
        let expectedDiv = $(
          `<div class="library_stat ${rowShade}">${expected}</div>`
        );
        expectedDiv.css("grid-area", handSize + index + 1 + " / 3");
        expectedDiv.appendTo(libraryDiv);
        let likelihood = hypergeometricSignificance(
          count,
          game.librarySize,
          index + 1,
          game.landsInLibrary
        );
        let likelihoodDiv = $(
          `<div class="library_stat ${rowShade}">${(likelihood * 100).toFixed(
            2
          )}</div>`
        );
        likelihoodDiv.css("grid-area", handSize + index + 1 + " / 4");
        likelihoodDiv.appendTo(libraryDiv);
        let percentile = hypergeometricRange(
          0,
          count,
          game.librarySize,
          index + 1,
          game.landsInLibrary
        );
        let percentileDiv = $(
          `<div class="library_stat ${rowShade}">${(percentile * 100).toFixed(
            2
          )}</div>`
        );
        percentileDiv.css("grid-area", handSize + index + 1 + " / 5");
        percentileDiv.appendTo(libraryDiv);
      });

      let footnoteLabel = $(
        '<div id="library_footnote_label' +
          gameIndex +
          '" class="library_footnote" tooltip-bottom ' +
          'tooltip-content="Click to show footnote" onclick="toggleVisibility(\'library_footnote_label' +
          gameIndex +
          "', 'library_footnote" +
          gameIndex +
          "')\">Footnote on Likelihood</div>"
      );
      footnoteLabel.css("grid-row", game.shuffledOrder.length + 1);
      footnoteLabel.appendTo(libraryDiv);
      let footnote = $(
        '<div id="library_footnote' +
          gameIndex +
          '" class="library_footnote hidden" ' +
          "onclick=\"toggleVisibility('library_footnote_label" +
          gameIndex +
          "', 'library_footnote" +
          gameIndex +
          "')\">" +
          "<p>The Likelihood column calculations are designed to enable assessment of fairness at a glance, in a way " +
          "that is related to percentile but differs in important ways. In short, it treats the count of lands as if " +
          "it were actually a bucket covering a continuous range, and calculates the cumulative probability of the " +
          "continuous value being at least as far from the median as a randomly selected value within the range covered " +
          "by the actual count. Importantly, this guarantees that the theoretical average will always be exactly 50%.</p>" +
          "<p>For values that are not the median, the result is halfway between the value's own percentile and the " +
          "next one up or down. For the median itself, the covered range is split and weighted for how much of it is " +
          "on each side of the 50th percentile. In both cases, the result's meaning is the same for each direction " +
          "from the 50th percentile, and scaled up by a factor of 2 to keep the possible range at 0% to 100%. " +
          "For precise details, see the source code on github.</p></div>"
      );
      footnote.css("grid-row", game.shuffledOrder.length + 1);
      footnote.appendTo(libraryDiv);

      $("#ux_1").append(libraryDiv);
    });
  }

  $(".openLog").click(function() {
    shell.openItem(path.join(actionLogDir, id + ".txt"));
  });

  $(".exportDeckPlayer").click(function() {
    var list = get_deck_export(match.playerDeck);
    ipc_send("set_clipboard", list);
  });
  $(".exportDeckStandardPlayer").click(function() {
    var list = get_deck_export_txt(match.playerDeck);
    ipc_send("export_txt", { str: list, name: match.playerDeck.name });
  });

  $(".exportDeck").click(function() {
    var list = get_deck_export(match.oppDeck);
    ipc_send("set_clipboard", list);
  });
  $(".exportDeckStandard").click(function() {
    var list = get_deck_export_txt(match.oppDeck);
    ipc_send("export_txt", {
      str: list,
      name: match.opponent.name.slice(0, -6) + "'s deck"
    });
  });

  $(".back").click(function() {
    change_background("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

//
function toggleVisibility(...ids) {
  ids.forEach(id => {
    let el = document.getElementById(id);
    if (el.classList.contains("hidden")) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

//
function add_checkbox(div, label, iid, def, func = "updateUserSettings()") {
  label = $('<label class="check_container hover_label">' + label + "</label>");
  label.appendTo(div);
  var check_new = $(
    '<input type="checkbox" id="' + iid + '" onclick="' + func + '" />'
  );
  check_new.appendTo(label);
  check_new.prop("checked", def);

  var span = $('<span class="checkmark"></span>');
  span.appendTo(label);
  return label;
}

//
function open_settings(openSection) {
  lastSettingsSection = openSection;
  change_background("default");
  hideLoadingBars();
  $("#ux_0").off();
  $("#history_column").off();
  $("#ux_0").html("");
  $("#ux_0").addClass("flex_item");

  var wrap_l = $('<div class="wrapper_column sidebar_column_r"></div>');
  $(
    '<div class="settings_nav sn1" style="margin-top: 28px;" >Behaviour</div>'
  ).appendTo(wrap_l);
  $('<div class="settings_nav sn2">Overlay</div>').appendTo(wrap_l);
  $('<div class="settings_nav sn3">Visual</div>').appendTo(wrap_l);
  $('<div class="settings_nav sn4">Privacy</div>').appendTo(wrap_l);
  $('<div class="settings_nav sn5">About</div>').appendTo(wrap_l);

  if (offlineMode) {
    $('<div class="settings_nav sn6">Login</div>').appendTo(wrap_l);
  } else {
    $('<div class="settings_nav sn6">Logout</div>').appendTo(wrap_l);
  }

  var wrap_r = $('<div class="wrapper_column"></div>');
  var div = $('<div class="settings_page"></div>');
  var section;

  //
  section = $('<div class="settings_section ss1"></div>');
  section.appendTo(div);
  section.append('<div class="settings_title">Behaviour</div>');

  add_checkbox(
    section,
    "Login automatically",
    "settings_autologin",
    settings.auto_login,
    "updateAppSettings()"
  );
  const launchToTrayCheckbox = add_checkbox(
    section,
    "Launch to tray",
    "settings_launchtotray",
    settings.launch_to_tray,
    "updateAppSettings()"
  );
  add_checkbox(
    section,
    "Launch on startup",
    "settings_startup",
    settings.startup
  );
  add_checkbox(
    section,
    "Read log on login",
    "settings_readlogonlogin",
    !settings.skip_firstpass
  );
  section.append(`
      <div class="settings_note">
      <i>Reading the log on startup can take a while, disabling this will make mtgatool load instantly, but you may have have to play with Arena to load some data, like Rank, wildcards and decklists. <b>This feature makes mtgatool read games when it was closed.</b></i>
      </div>`);
  add_checkbox(
    section,
    "Close main window on match found",
    "settings_closeonmatch",
    settings.close_on_match
  );
  add_checkbox(
    section,
    "Close to tray",
    "settings_closetotray",
    settings.close_to_tray
  );
  add_checkbox(
    section,
    "Sound when priority changes",
    "settings_soundpriority",
    settings.sound_priority
  );

  var sliderSoundVolume = $('<div class="slidecontainer_settings"></div>');
  sliderSoundVolume.appendTo(section);
  var sliderSoundVolumeLabel = $(
    `<label style="width: 400px;">Volume: ${Math.round(
      settings.sound_priority_volume * 100
    )}%</label>`
  );
  sliderSoundVolumeLabel.appendTo(sliderSoundVolume);
  var sliderSoundVolumeInput = $(
    '<input type="range" min="0" max="1" step=".001" value="' +
      settings.sound_priority_volume +
      '" class="slider sliderSoundVolume" id="settings_soundpriorityvolume">'
  );
  sliderSoundVolumeInput.appendTo(sliderSoundVolume);

  var label = $('<label class="but_container_label">Export Format:</label>');
  label.appendTo(section);
  var icd = $('<div class="input_container"></div>');
  var export_input = $(
    '<input type="search" id="settings_export_format" autocomplete="off" value="' +
      settings.export_format +
      '" />'
  );
  export_input.appendTo(icd);
  icd.appendTo(label);

  section.append(`<div class="settings_note">
      <i>Possible variables: $Name, $Count, $SetName, $SetCode, $Collector, $Rarity, $Type, $Cmc</i>
      </div>`);

  section = $('<div class="settings_section ss2"></div>');
  section.appendTo(div);
  section.append('<div class="settings_title">Overlay</div>');

  add_checkbox(
    section,
    "Always on top",
    "settings_overlay_ontop",
    settings.overlay_ontop
  );
  add_checkbox(
    section,
    "Show overlay",
    "settings_showoverlay",
    settings.show_overlay
  );
  add_checkbox(
    section,
    "Persistent overlay&nbsp;<i>(useful for OBS setup)</i>",
    "settings_showoverlayalways",
    settings.show_overlay_always
  );

  add_checkbox(
    section,
    "Show top bar",
    "settings_overlay_top",
    settings.overlay_top
  );
  add_checkbox(
    section,
    "Show title",
    "settings_overlay_title",
    settings.overlay_title
  );
  add_checkbox(
    section,
    "Show deck/lists",
    "settings_overlay_deck",
    settings.overlay_deck
  );
  add_checkbox(
    section,
    "Show clock",
    "settings_overlay_clock",
    settings.overlay_clock
  );
  add_checkbox(
    section,
    "Show sideboard",
    "settings_overlay_sideboard",
    settings.overlay_sideboard
  );

  var sliderOpacity = $('<div class="slidecontainer_settings"></div>');
  sliderOpacity.appendTo(section);
  var sliderOpacityLabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Elements transparency: ' +
      transparencyFromAlpha(overlayAlpha) +
      "%</label>"
  );
  sliderOpacityLabel.appendTo(sliderOpacity);
  var sliderOpacityInput = $(
    '<input type="range" min="0" max="100" step="5" value="' +
      transparencyFromAlpha(overlayAlpha) +
      '" class="slider sliderB" id="opacityRange">'
  );
  sliderOpacityInput.appendTo(sliderOpacity);

  var sliderOpacityBack = $('<div class="slidecontainer_settings"></div>');
  sliderOpacityBack.appendTo(section);
  var sliderOpacityBackLabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Background transparency: ' +
      transparencyFromAlpha(overlayAlphaBack) +
      "%</label>"
  );
  sliderOpacityBackLabel.appendTo(sliderOpacityBack);
  var sliderOpacityBackInput = $(
    '<input type="range" min="0" max="100" step="5" value="' +
      transparencyFromAlpha(overlayAlphaBack) +
      '" class="slider sliderC" id="opacityBackRange">'
  );
  sliderOpacityBackInput.appendTo(sliderOpacityBack);

  var sliderScale = $('<div class="slidecontainer_settings"></div>');
  sliderScale.appendTo(section);
  var sliderScaleLabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Scale: ' +
      overlayScale +
      "%</label>"
  );
  sliderScaleLabel.appendTo(sliderScale);
  var sliderScaleInput = $(
    '<input type="range" min="10" max="200" step="10" value="' +
      overlayScale +
      '" class="slider sliderD" id="scaleRange">'
  );
  sliderScaleInput.appendTo(sliderScale);

  $(
    '<div class="button_simple centered resetOverlayPos">Reset Position</div>'
  ).appendTo(section);

  //
  section = $('<div class="settings_section ss3"></div>');
  section.appendTo(div);
  section.append('<div class="settings_title">Visual</div>');

  label = $('<label class="but_container_label">Background URL:</label>');
  label.appendTo(section);

  icd = $('<div class="input_container"></div>');
  var url_input = $(
    '<input type="search" id="query_image" autocomplete="off" value="' +
      settings.back_url +
      '" />'
  );
  url_input.appendTo(icd);
  icd.appendTo(label);

  label = $('<label class="but_container_label">Background shade:</label>');
  var colorPick = $('<input type="text" id="flat" class="color_picker" />');
  colorPick.appendTo(label);
  label.appendTo(section);
  colorPick.spectrum({
    showInitial: true,
    showAlpha: true,
    showButtons: false
  });
  colorPick.spectrum("set", settings.back_color);

  colorPick.on("dragstop.spectrum", function(e, color) {
    $(".main_wrapper").css("background-color", color.toRgbString());
    updateUserSettings();
  });

  label = $('<label class="but_container_label">Cards quality:</label>');
  label.appendTo(section);
  var button = $(
    '<div class="button_simple button_long" style="margin-left: 32px;" onclick="changeQuality(this)">' +
      cardQuality +
      "</div>"
  );
  button.appendTo(label);

  var slider = $('<div class="slidecontainer_settings"></div>');
  slider.appendTo(section);
  var sliderlabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Cards size: ' +
      cardSize +
      "px</label>"
  );
  sliderlabel.appendTo(slider);
  var sliderInput = $(
    '<input type="range" min="0" max="20" value="' +
      cardSizePos +
      '" class="slider sliderA" id="myRange">'
  );
  sliderInput.appendTo(slider);

  var d = $(
    '<div style="width: ' +
      cardSize +
      'px; !important" class="inventory_card_settings"></div>'
  );
  var img = $(
    '<img style="width: ' +
      cardSize +
      'px; !important" class="inventory_card_settings_img"></img>'
  );

  var card = cardsDb.get(67518);
  img.attr("src", get_card_image(card));
  img.appendTo(d);

  d.appendTo(slider);

  //
  section = $('<div class="settings_section ss4"></div>');
  section.appendTo(div);
  section.append('<div class="settings_title">Privacy</div>');
  add_checkbox(
    section,
    "Anonymous sharing&nbsp;<i>(makes your username anonymous on Explore)</i>",
    "settings_anon_explore",
    settings.anon_explore
  );
  add_checkbox(
    section,
    "Online sharing&nbsp;<i>(when disabled, blocks any connections with our servers)</i>",
    "settings_senddata",
    settings.send_data
  );

  label = $('<label class="check_container_but"></label>');
  label.appendTo(section);
  button = $(
    '<div class="button_simple button_long" onclick="eraseData()">Erase my shared data</div>'
  );
  button.appendTo(label);

  //
  section = $('<div class="settings_section ss5" style="height: 100%;"></div>');
  section.appendTo(div);
  //section.append('<div class="settings_title">About</div>');

  var about = $('<div class="about"></div>');
  about.append('<div class="top_logo_about"></div>');
  about.append(
    '<div class="message_sub_15 white">By Manuel Etchegaray, 2019</div>'
  );
  about.append(
    '<div class="message_sub_15 white">Version ' +
      remote.app.getVersion() +
      "</div>"
  );

  about.append('<div class="message_updates green">' + updateState + ".</div>");
  button = $(
    '<div class="button_simple centered update_link_about">Check for updates</div>'
  );
  button.appendTo(about);

  about.append(
    '<div class="flex_item" style="margin: 64px auto 0px auto;"><div class="discord_link"></div><div class="twitter_link"></div><div class="git_link"></div></div>'
  );
  about.append(
    '<div class="message_sub_15 white" style="margin: 24px 0 12px 0;">Support my work!</div><div class="donate_link"><img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" alt="PayPal" /></div>'
  );
  about.appendTo(section);

  //
  section = $('<div class="settings_section ss6" style="height: 100%;"></div>');
  var login = $('<div class="about"></div>');
  section.appendTo(div);
  if (offlineMode) {
    button = $(
      '<div class="button_simple centered login_link_about">Login</div>'
    );
  } else {
    button = $(
      '<div class="button_simple centered login_link_about">Logout</div>'
    );
  }
  button.appendTo(login);
  login.appendTo(section);

  div.appendTo(wrap_r);
  $("#ux_0").append(wrap_l);
  $("#ux_0").append(wrap_r);

  $(".ss" + openSection).show();
  $(".sn" + openSection).addClass("nav_selected");

  $(".resetOverlayPos").click(function() {
    ipc_send("reset_overlay_pos", true);
  });

  $(".top_logo_about").click(function() {
    shell.openExternal("https://mtgatool.com");
  });

  $(".twitter_link").click(function() {
    shell.openExternal("https://twitter.com/MEtchegaray7");
  });

  $(".discord_link").click(function() {
    shell.openExternal("https://discord.gg/K9bPkJy");
  });

  $(".git_link").click(function() {
    shell.openExternal("https://github.com/Manuel-777/MTG-Arena-Tool");
  });

  $(".release_notes_link").click(function() {
    shell.openExternal("https://mtgatool.com/release-notes/");
  });

  $(".donate_link").click(function() {
    shell.openExternal("https://www.paypal.me/ManuelEtchegaray/10");
  });

  $(".login_link_about").click(function() {
    const clearAppSettings = {
      remember_me: false,
      auto_login: false,
      launch_to_tray: false
    };
    ipc_send("save_app_settings", clearAppSettings);
    remote.app.relaunch();
    remote.app.exit(0);
  });

  $(".update_link_about").click(function() {
    ipc_send("updates_check", true);
  });

  $(".settings_nav").click(function() {
    if (!$(this).hasClass("nav_selected")) {
      $(".settings_nav").each(function() {
        $(this).removeClass("nav_selected");
      });
      $(".settings_section").each(function() {
        $(this).hide();
      });

      $(this).addClass("nav_selected");

      if ($(this).hasClass("sn1")) {
        sidebarActive = 8;
        lastSettingsSection = 1;
        $(".ss1").show();
      }
      if ($(this).hasClass("sn2")) {
        sidebarActive = 8;
        lastSettingsSection = 2;
        $(".ss2").show();
      }
      if ($(this).hasClass("sn3")) {
        sidebarActive = 8;
        lastSettingsSection = 3;
        $(".ss3").show();
      }
      if ($(this).hasClass("sn4")) {
        sidebarActive = 8;
        lastSettingsSection = 4;
        $(".ss4").show();
      }
      if ($(this).hasClass("sn5")) {
        sidebarActive = 9;
        lastSettingsSection = 5;
        $(".ss5").show();
      }
      if ($(this).hasClass("sn6")) {
        sidebarActive = 8;
        lastSettingsSection = 6;
        $(".ss6").show();
      }
    }
  });

  url_input.on("keyup", function(e) {
    if (e.keyCode == 13) {
      updateUserSettings();
    }
  });

  export_input.on("keyup", function() {
    updateUserSettings();
  });

  $(".sliderA").off();

  $(".sliderA").on("click mousemove", function() {
    cardSizePos = Math.round(parseInt(this.value));
    cardSize = 100 + cardSizePos * 10;
    sliderlabel.html("Cards size: " + cardSize + "px");

    $(".inventory_card_settings").css("width", "");
    var styles = $(".inventory_card_settings").attr("style");
    styles += "width: " + cardSize + "px !important;";
    $(".inventory_card_settings").attr("style", styles);

    $(".inventory_card_settings_img").css("width", "");
    styles = $(".inventory_card_settings_img").attr("style");
    styles += "width: " + cardSize + "px !important;";
    $(".inventory_card_settings_img").attr("style", styles);
  });

  $(".sliderA").on("click mouseup", function() {
    cardSizePos = Math.round(parseInt(this.value));
    updateUserSettings();
  });

  $(".sliderB").off();

  $(".sliderB").on("click mousemove", function() {
    overlayAlpha = alphaFromTransparency(parseInt(this.value));
    sliderOpacityLabel.html(
      "Elements transparency: " + transparencyFromAlpha(overlayAlpha) + "%"
    );
  });

  $(".sliderB").on("click mouseup", function() {
    overlayAlpha = alphaFromTransparency(parseInt(this.value));
    updateUserSettings();
  });

  $(".sliderC").on("click mousemove", function() {
    overlayAlphaBack = alphaFromTransparency(parseInt(this.value));
    sliderOpacityBackLabel.html(
      "Background transparency: " +
        transparencyFromAlpha(overlayAlphaBack) +
        "%"
    );
  });

  $(".sliderC").on("click mouseup", function() {
    overlayAlphaBack = alphaFromTransparency(parseInt(this.value));
    updateUserSettings();
  });

  $(".sliderD").off();

  $(".sliderD").on("click mousemove", function() {
    overlayScale = parseInt(this.value);
    sliderScaleLabel.html("Scale: " + overlayScale + "%");
  });

  $(".sliderD").on("click mouseup", function() {
    overlayScale = parseInt(this.value);
    updateUserSettings();
  });

  $(".sliderSoundVolume").off();

  $(".sliderSoundVolume").on("click mouseup", function() {
    sliderSoundVolumeLabel.html(
      `Volume: ${Math.round(settings.sound_priority_volume * 100)}%`
    );
    let { Howl, Howler } = require("howler");
    let sound = new Howl({ src: ["../sounds/blip.mp3"] });
    updateUserSettings();
    Howler.volume(settings.sound_priority_volume);
    sound.play();
  });
}

function alphaFromTransparency(transparency) {
  return 1 - transparency / 100;
}

function transparencyFromAlpha(alpha) {
  return Math.round((1 - alpha) * 100);
}

//
function change_background(arg, grpId = 0) {
  var artistLine = "";
  var _card = cardsDb.get(grpId);

  //console.log(arg, grpId, _card);
  if (arg == "default") {
    $(".top_artist").html("Ghitu Lavarunner by Jesper Ejsing");
    if (defaultBackground == "") {
      $(".main_wrapper").css(
        "background-image",
        "url(../images/Ghitu-Lavarunner-Dominaria-MtG-Art.jpg)"
      );
    } else {
      $(".top_artist").html("");
      $(".main_wrapper").css(
        "background-image",
        "url(" + defaultBackground + ")"
      );
    }
  } else if (_card != false) {
    console.log(_card.images["art_crop"]);
    $(".main_wrapper").css(
      "background-image",
      "url(https://img.scryfall.com/cards" + _card.images["art_crop"] + ")"
    );
  } else if (fs.existsSync(arg)) {
    $(".top_artist").html("");
    $(".main_wrapper").css("background-image", "url(" + arg + ")");
  } else {
    $(".top_artist").html("");
    $.ajax({
      url: arg,
      type: "HEAD",
      error: function() {
        $(".main_wrapper").css("background-image", "");
      },
      success: function() {
        $(".main_wrapper").css("background-image", "url(" + arg + ")");
      }
    });
  }

  if (_card) {
    try {
      artistLine = _card.name + " by " + _card.artist;
      $(".top_artist").html(artistLine);
    } catch (e) {
      console.log(e);
    }
  }
}

//
/* eslint-disable */
function changeQuality(dom) {
  if (cardQuality == "normal") {
    cardQuality = "large";
  } else if (cardQuality == "large") {
    cardQuality = "small";
  } else if (cardQuality == "small") {
    cardQuality = "normal";
  }
  dom.innerHTML = cardQuality;
  updateUserSettings();
  open_settings(lastSettingsSection);
}

//
function eraseData() {
  if (
    confirm(
      "This will erase all of your decks and events shared online, are you sure?"
    )
  ) {
    ipc_send("delete_data", true);
  } else {
    return;
  }
}
/* eslint-enable */

//
function updateUserSettings() {
  var startup = document.getElementById("settings_startup").checked;
  var readonlogin = document.getElementById("settings_readlogonlogin").checked;
  var showOverlay = document.getElementById("settings_showoverlay").checked;
  var showOverlayAlways = document.getElementById("settings_showoverlayalways")
    .checked;
  var soundPriority = document.getElementById("settings_soundpriority").checked;

  var soundPriorityVolume = document.getElementById(
    "settings_soundpriorityvolume"
  ).value;

  var backColor = $(".color_picker")
    .spectrum("get")
    .toRgbString();
  var backUrl = document.getElementById("query_image").value;
  defaultBackground = backUrl;
  if (backUrl == "") change_background("default");
  else change_background(backUrl);

  var overlayOnTop = document.getElementById("settings_overlay_ontop").checked;
  var closeToTray = document.getElementById("settings_closetotray").checked;
  var sendData = document.getElementById("settings_senddata").checked;
  var anonExplore = document.getElementById("settings_anon_explore").checked;

  var closeOnMatch = document.getElementById("settings_closeonmatch").checked;

  var overlayTop = document.getElementById("settings_overlay_top").checked;
  var overlayTitle = document.getElementById("settings_overlay_title").checked;
  var overlayDeck = document.getElementById("settings_overlay_deck").checked;
  var overlayClock = document.getElementById("settings_overlay_clock").checked;
  var overlaySideboard = document.getElementById("settings_overlay_sideboard")
    .checked;

  var exportFormat = document.getElementById("settings_export_format").value;
  settings = {
    sound_priority: soundPriority,
    sound_priority_volume: soundPriorityVolume,
    show_overlay: showOverlay,
    show_overlay_always: showOverlayAlways,
    startup: startup,
    close_to_tray: closeToTray,
    send_data: sendData,
    close_on_match: closeOnMatch,
    cards_size: cardSizePos,
    cards_quality: cardQuality,
    overlay_alpha: overlayAlpha,
    overlay_alpha_back: overlayAlphaBack,
    overlay_scale: overlayScale,
    overlay_top: overlayTop,
    overlay_title: overlayTitle,
    overlay_deck: overlayDeck,
    overlay_clock: overlayClock,
    overlay_sideboard: overlaySideboard,
    overlay_ontop: overlayOnTop,
    anon_explore: anonExplore,
    back_color: backColor,
    back_url: backUrl,
    export_format: exportFormat,
    skip_firstpass: !readonlogin
  };
  cardSize = 100 + cardSizePos * 10;
  ipc_send("save_user_settings", settings);
}

//
function updateAppSettings() {
  const auto_login = document.getElementById("settings_autologin").checked;
  let launch_to_tray = document.getElementById("settings_launchtotray").checked;
  const rSettings = {
    auto_login,
    launch_to_tray
  };
  ipc_send("save_app_settings", rSettings);
}

//
function formatPercent(value, config = {}) {
  return value.toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2,
    ...config
  });
}

//
function formatNumber(value, config = {}) {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

//
function getWinrateClass(wr) {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

function getEventWinLossClass(wlGate) {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
  if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  return "red";
}

//
function getDeckWinrate(deckid, lastEdit) {
  var wins = 0;
  var loss = 0;
  var winsLastEdit = 0;
  var lossLastEdit = 0;
  var colorsWinrates = [];
  var tagsWinrates = [];

  if (matchesHistory == undefined) {
    return 0;
  }

  matchesHistory.matches.forEach(function(matchid, index) {
    let match = matchesHistory[matchid];
    if (matchid != null && match != undefined) {
      if (match.type == "match") {
        if (match.playerDeck.id == deckid) {
          var oppDeckColors = get_deck_colors(match.oppDeck);
          if (oppDeckColors.length > 0) {
            let added = -1;

            colorsWinrates.forEach(function(wr, index) {
              if (compare_colors(wr.colors, oppDeckColors)) {
                added = index;
              }
            });

            if (added == -1) {
              added =
                colorsWinrates.push({
                  colors: oppDeckColors,
                  wins: 0,
                  losses: 0
                }) - 1;
            }

            if (match.player.win > match.opponent.win) {
              if (index > -1) {
                colorsWinrates[added].wins++;
              }

              wins++;
            }
            if (match.player.win < match.opponent.win) {
              if (index > -1) {
                colorsWinrates[added].losses++;
              }
              loss++;
            }

            if (match.date > lastEdit) {
              if (match.player.win > match.opponent.win) {
                winsLastEdit++;
              } else {
                lossLastEdit++;
              }
            }
          }

          if (match.tags !== undefined && match.tags.length > 0) {
            let tag = match.tags[0];
            let added = -1;

            tagsWinrates.forEach(function(wr, index) {
              if (wr.tag == tag) {
                added = index;
              }
            });

            if (added == -1) {
              added = tagsWinrates.push({ tag: tag, wins: 0, losses: 0 }) - 1;
            }

            tagsWinrates[added].colors = oppDeckColors;
            if (match.player.win > match.opponent.win) {
              tagsWinrates[added].wins += 1;
            }
            if (match.player.win < match.opponent.win) {
              tagsWinrates[added].losses += 1;
            }
          }
        }
      }
    }
  });

  if (wins == 0 && loss == 0) {
    return 0;
  }

  var winrate = Math.round((1 / (wins + loss)) * wins * 100) / 100;
  var winrateLastEdit =
    Math.round((1 / (winsLastEdit + lossLastEdit)) * winsLastEdit * 100) / 100;
  if (winsLastEdit == 0) winrateLastEdit = 0;

  //colorsWinrates.sort(compare_color_winrates);
  colorsWinrates.sort(compare_winrates);
  tagsWinrates.sort(compare_winrates);

  return {
    total: winrate,
    wins: wins,
    losses: loss,
    lastEdit: winrateLastEdit,
    colors: colorsWinrates,
    tags: tagsWinrates
  };
}

function compare_winrates(a, b) {
  let _a = a.wins / a.losses;
  let _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compare_color_winrates(a, b);
}

function compare_color_winrates(a, b) {
  a = a.colors;
  b = b.colors;

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  let sa = a.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  let sb = b.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
}

//
function sort_decks(compareFunc = compare_decks) {
  decks.sort(compareFunc);
  decks.forEach(function(deck) {
    deck.colors = [];
    deck.colors = get_deck_colors(deck);
    deck.mainDeck.sort(compare_cards);
  });
}

//
function compare_decks(a, b) {
  a = playerData.decks_last_used.indexOf(a.id);
  b = playerData.decks_last_used.indexOf(b.id);

  if (a == b) {
    a = Date.parse(a.lastUpdated);
    b = Date.parse(b.lastUpdated);
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  } else {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  }
}

//
function compare_changes(a, b) {
  a = Date.parse(a.date);
  b = Date.parse(b.date);
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

//
function compare_changes_inner(a, b) {
  a = a.quantity;
  b = b.quantity;
  if (a > 0 && b > 0) {
    if (a < b) return -1;
    if (a > b) return 1;
  }
  if (a < 0 && b < 0) {
    if (a < b) return 1;
    if (a > b) return -1;
  }
  if (a < 0 && b > 0) {
    return -1;
  }
  if (a > 0 && b < 0) {
    return 1;
  }
  return 0;
}

//
function compare_courses(a, b) {
  if (a == undefined) return -1;
  if (b == undefined) return 1;

  a = eventsHistory[a];
  b = eventsHistory[b];

  if (a == undefined) return -1;
  if (b == undefined) return 1;

  a = Date.parse(a.date);
  b = Date.parse(b.date);
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

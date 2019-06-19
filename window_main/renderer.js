const { ipcRenderer: ipc, remote, shell } = require("electron");
const sha1 = require("js-sha1");
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
window.$ = window.jQuery = require("jquery");
require("jquery.easing");
require("time-elements");

const { HIDDEN_PW } = require("../shared/constants");
const pd = require("../shared/player-data");
const { queryElements: $$ } = require("../shared/dom-fns");
const {
  compare_cards,
  get_deck_colors,
  get_rank_index,
  removeDuplicates
} = require("../shared/util");

const {
  changeBackground,
  getLocalState,
  hideLoadingBars,
  ipcSend,
  pop,
  setLocalState,
  showLoadingBars
} = require("./renderer-util");
const {
  createAllMatches,
  getDefaultFilters,
  RANKED_CONST,
  RANKED_DRAFT,
  DATE_SEASON
} = require("./aggregator");
const { openHomeTab, requestHome } = require("./home");
const { tournamentOpen } = require("./tournaments");
const { openDecksTab } = require("./decks");
const { openDeck } = require("./deck-details");
const { openHistoryTab } = require("./history");
const { openEventsTab } = require("./events");
const { openEconomyTab } = require("./economy");
const { openExploreTab, setExploreDecks } = require("./explore");
const { openCollectionTab } = require("./collection");
const { openSettingsTab, setCurrentOverlaySettings } = require("./settings");

let sidebarActive = -2;
let loggedIn = false;
let canLogin = false;
let lastSettings = {};

//
ipc.on("clear_pwd", function() {
  document.getElementById("signin_pass").value = "";
});

//
ipc.on("auth", function(event, arg) {
  setLocalState({ authToken: arg.token });
  if (arg.ok) {
    $(".message_center").css("display", "flex");
    $(".authenticate").hide();
    loggedIn = true;
  } else {
    canLogin = true;
    ipcSend("renderer_show");
    pop(arg.error, -1);
  }
});

//
ipc.on("set_discord_tag", (event, arg) => {
  setLocalState({ discordTag: arg });
  if (sidebarActive == -1) {
    openHomeTab(null, true);
  }
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

//
ipc.on("show_login", () => {
  canLogin = true;
  showLogin();
});

//
function showLogin() {
  $(".authenticate").show();
  $(".message_center").css("display", "none");
  $(".init_loading").hide();
  $(".button_simple_disabled").addClass("button_simple");
  $("#signin_user").focus();
}

//
ipc.on("player_data_updated", () => {
  if (sidebarActive != -99) {
    $(".top_username").html(pd.name.slice(0, -6));
    $(".top_username_id").html(pd.name.slice(-6));

    let rankOffset;
    let constructed = pd.rank.constructed;
    rankOffset = get_rank_index(constructed.rank, constructed.tier);
    let constructedRankIcon = $$(".top_constructed_rank")[0];
    constructedRankIcon.style.backgroundPosition = rankOffset * -48 + "px 0px";
    constructedRankIcon.setAttribute(
      "title",
      constructed.rank + " " + constructed.tier
    );

    let limited = pd.rank.limited;
    rankOffset = get_rank_index(limited.rank, limited.tier);
    let limitedRankIcon = $$(".top_limited_rank")[0];
    limitedRankIcon.style.backgroundPosition = rankOffset * -48 + "px 0px";
    limitedRankIcon.setAttribute("title", limited.rank + " " + limited.tier);

    let patreonIcon = $$(".top_patreon")[0];
    if (pd.patreon) {
      let xoff = -40 * pd.patreon_tier;
      let title = "Patreon Basic Tier";

      if (pd.patreon_tier == 1) title = "Patreon Standard Tier";
      if (pd.patreon_tier == 2) title = "Patreon Modern Tier";
      if (pd.patreon_tier == 3) title = "Patreon Legacy Tier";
      if (pd.patreon_tier == 4) title = "Patreon Vintage Tier";

      patreonIcon.style.backgroundPosition = xoff + "px 0px";
      patreonIcon.setAttribute("title", title);
      patreonIcon.style.display = "block";
    } else {
      patreonIcon.style.display = "none";
    }
  }
});

//
ipc.on("set_home", function(event, arg) {
  hideLoadingBars();

  if (sidebarActive === -1) {
    console.log("Home", arg);
    openHomeTab(arg);
  }
});

//
ipc.on("set_explore_decks", function(event, arg) {
  hideLoadingBars();
  if (sidebarActive == 3) {
    setExploreDecks(arg);
  }
});

//
ipc.on("open_course_deck", function(event, arg) {
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  arg = arg.CourseDeck;
  arg.colors = get_deck_colors(arg);
  arg.mainDeck.sort(compare_cards);
  arg.sideboard.sort(compare_cards);
  // console.log(arg);

  arg.mainDeck = removeDuplicates(arg.mainDeck);
  arg.sideboard = removeDuplicates(arg.sideboard);
  openDeck(arg, null);
  hideLoadingBars();
});

//
ipc.on("settings_updated", function() {
  if (lastSettings.back_url !== pd.settings.back_url) {
    changeBackground();
  }
  $(".main_wrapper").css("background-color", pd.settings.back_color);
  if (sidebarActive === 6) {
    const ls = getLocalState();
    openSettingsTab(-1, ls.lastScrollTop);
  }
  lastSettings = { ...pd.settings };
});

//
ipc.on("player_data_refresh", () => {
  const ls = getLocalState();
  openTab(sidebarActive, {}, ls.lastDataIndex, ls.lastScrollTop);
});

//
ipc.on("set_update_state", function(event, arg) {
  if (sidebarActive == 9) {
    openSettingsTab(5);
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
ipc.on("force_open_overlay_settings", function(event, arg) {
  setCurrentOverlaySettings(arg);
  force_open_settings(2);
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
  ipcSend("save_app_settings", rSettings);
}

//
function openTab(tab, filters = {}, dataIndex = 0, scrollTop = 0) {
  showLoadingBars();
  $(".top_nav_item").each(function() {
    $(this).removeClass("item_selected");
  });
  let tabClass = "it" + tab;
  $("#ux_0").html("");
  switch (tab) {
    case 0:
      openDecksTab(filters, scrollTop);
      break;
    case 1:
      openHistoryTab(filters, dataIndex, scrollTop);
      break;
    case 2:
      openEventsTab(filters, dataIndex, scrollTop);
      break;
    case 3:
      if (pd.offline) {
        showOfflineSplash();
      } else {
        openExploreTab();
      }
      break;
    case 4:
      openEconomyTab(dataIndex, scrollTop);
      break;
    case 5:
      openCollectionTab();
      break;
    case 6:
      openSettingsTab(-1, scrollTop);
      break;
    case -1:
      tabClass = "ith";
      if (pd.offline) {
        showOfflineSplash();
      } else {
        if (getLocalState().discordTag === null) {
          openHomeTab(null, true);
        } else {
          requestHome();
        }
      }
      break;
    case -2:
    default:
      //$(".message_center").css("display", "initial");
      hideLoadingBars();
      $(".init_loading").show();
      break;
  }
  $("." + tabClass).addClass("item_selected");
  ipcSend("save_user_settings", { last_open_tab: tab });
}

//
ipc.on("initialize", function() {
  showLoadingBars();
  if (pd.name) {
    $(".top_username").html(pd.name.slice(0, -6));
    $(".top_username_id").html(pd.name.slice(-6));
  }

  sidebarActive = pd.settings.last_open_tab;
  const totalAgg = createAllMatches();
  setLocalState({ totalAgg });
  openTab(sidebarActive);

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
      ipcSend("set_log", document.getElementById("log_input").value);
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

//
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
ipc.on("offline", function() {
  showOfflineSplash();
});

//
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

//
$(".list_deck").on("mouseenter mouseleave", function(e) {
  $(".deck_tile").trigger(e.type);
});

//
ipc.on("popup", function(event, arg, time) {
  pop(arg, time);
});

//
function force_open_settings(section = -1) {
  sidebarActive = 6;
  $(".top_nav_item").each(function() {
    $(this).removeClass("item_selected");
    if ($(this).hasClass("it6")) {
      $(this).addClass("item_selected");
    }
  });
  $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  openSettingsTab(section, 0);
}

//
function force_open_about() {
  sidebarActive = 9;
  $(".top_nav_item").each(function() {
    $(this).removeClass("item_selected");
    if ($(this).hasClass("it7")) {
      $(this).addClass("item_selected");
    }
  });
  $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  openSettingsTab(5, 0);
}

//
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
    ipcSend("login", { username: "", password: "" });
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
      ipcSend("login", { username: user, password: pass });
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
    ipcSend("renderer_window_close", 1);
  });

  //
  $(".minimize").click(function() {
    ipcSend("renderer_window_minimize", 1);
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
    changeBackground("default");
    document.body.style.cursor = "auto";
    if (!$(this).hasClass("item_selected")) {
      $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
      let filters = {};
      if ($(this).hasClass("ith")) {
        sidebarActive = -1;
      } else if ($(this).hasClass("it0")) {
        sidebarActive = 0;
      } else if ($(this).hasClass("it1")) {
        sidebarActive = 1;
      } else if ($(this).hasClass("it2")) {
        sidebarActive = 2;
      } else if ($(this).hasClass("it3")) {
        sidebarActive = 3;
      } else if ($(this).hasClass("it4")) {
        sidebarActive = 4;
      } else if ($(this).hasClass("it5")) {
        sidebarActive = 5;
      } else if ($(this).hasClass("it6")) {
        sidebarActive = 6;
      } else if ($(this).hasClass("it7")) {
        sidebarActive = 1;
        filters = {
          ...getDefaultFilters(),
          date: DATE_SEASON,
          eventId: RANKED_CONST,
          rankedMode: true
        };
      } else if ($(this).hasClass("it8")) {
        sidebarActive = 1;
        filters = {
          ...getDefaultFilters(),
          date: DATE_SEASON,
          eventId: RANKED_DRAFT,
          rankedMode: true
        };
      }
      openTab(sidebarActive, filters);
    } else {
      $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
    }
  });
});

//
//ipc.on("show_loading", () => showLoadingBars());

//
//ipc.on("hide_loading", () => hideLoadingBars());

//
ipc.on("set_draft_link", function(event, arg) {
  hideLoadingBars();
  document.getElementById("share_input").value = arg;
});

//
ipc.on("tou_set", function(event, arg) {
  document.body.style.cursor = "auto";
  tournamentOpen(arg);
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
});

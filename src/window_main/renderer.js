import { ipcRenderer as ipc, remote, shell } from "electron";
import sha1 from "js-sha1";
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
  const Sentry = require("@sentry/electron");
  Sentry.init({
    dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
  });
}

import anime from "animejs";
import "time-elements";

import {
  EASING_DEFAULT,
  HIDDEN_PW,
  MAIN_LOGIN,
  MAIN_HOME,
  MAIN_EXPLORE,
  MAIN_SETTINGS,
  MAIN_UPDATE,
  SETTINGS_ABOUT,
  SETTINGS_OVERLAY
} from "../shared/constants";

import pd from "../shared/player-data";
import { createDiv, queryElements as $$ } from "../shared/dom-fns";

import {
  compare_cards,
  get_deck_colors,
  removeDuplicates
} from "../shared/util";

import {
  changeBackground,
  getLocalState,
  hideLoadingBars,
  ipcSend,
  openDialog,
  pop,
  renderLogInput,
  setLocalState,
  showLoadingBars
} from "./renderer-util";

import { openHomeTab } from "./home";
import { tournamentOpen } from "./tournaments";
import { openDeck } from "./deck-details";
import { openSettingsTab, setCurrentOverlaySettings } from "./settings";
import { showWhatsNew } from "./whats-new";
import { showOfflineSplash } from "./renderer-util";
import { setExploreDecks } from "./explore";

import { openTab, forceOpenAbout, forceOpenSettings } from "./tabControl";
import { updateTopBar } from "./topNav";

const byId = id => document.getElementById(id);
let loggedIn = false;
let canLogin = false;
let lastSettings = {};

//
ipc.on("clear_pwd", function() {
  byId("signin_pass").value = "";
});

//
ipc.on("auth", function(event, arg) {
  setLocalState({ authToken: arg.token });
  if (arg.ok) {
    $$(".message_center")[0].style.display = "flex";
    $$(".authenticate")[0].style.display = "none";
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
  if (pd.settings.last_open_tab === MAIN_HOME) {
    openHomeTab(null, true);
  }
});

//
ipc.on("too_slow", function() {
  pop(
    'Loading is taking too long, please read our <a class="trouble_link">troubleshooting guide</a>.',
    0
  );

  const popDiv = $$(".popup")[0];
  popDiv.style.left = "calc(50% - 280px)";
  popDiv.style.width = "560px";
  popDiv.style.pointerEvents = "all";

  $$(".trouble_link")[0].addEventListener("click", function() {
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
  $$(".authenticate")[0].style.display = "block";
  $$(".message_center")[0].style.display = "none";
  $$(".init_loading")[0].style.display = "none";

  $$(".button_simple_disabled")[0].classList.add("button_simple");
  byId("signin_user").focus();
}

//
ipc.on("set_home", function(event, arg) {
  hideLoadingBars();

  if (pd.settings.last_open_tab === MAIN_HOME) {
    console.log("Home", arg);
    openHomeTab(arg);
  }
});

//
ipc.on("set_explore_decks", function(event, arg) {
  hideLoadingBars();
  if (pd.settings.last_open_tab === MAIN_EXPLORE) {
    setExploreDecks(arg);
  }
});

//
ipc.on("open_course_deck", function(event, arg) {
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
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
  let cardQuantityWidth = Math.min(pd.cardsSizeHoverCard - 24, 180);

  $$(".hover_card_quantity")[0].style.left =
    cardQuantityWidth + (pd.cardsSizeHoverCard - cardQuantityWidth) / 2 + "px";
  $$(".hover_card_quantity")[0].style.width = cardQuantityWidth + "px";

  $$(".main_hover")[0].style.width = pd.cardsSizeHoverCard + "px";
  $$(".main_hover")[0].style.height =
    pd.cardsSizeHoverCard / 0.71808510638 + "px";

  $$(".main_hover_dfc")[0].style.width = pd.cardsSizeHoverCard + "px";
  $$(".main_hover_dfc")[0].style.height =
    pd.cardsSizeHoverCard / 0.71808510638 + "px";

  $$(".loader")[0].style.width = pd.cardsSizeHoverCard + "px";
  $$(".loader")[0].style.height = pd.cardsSizeHoverCard / 0.71808510638 + "px";

  $$(".loader_dfc")[0].style.width = pd.cardsSizeHoverCard + "px";
  $$(".loader_dfc")[0].style.height =
    pd.cardsSizeHoverCard / 0.71808510638 + "px";

  if (lastSettings.back_url !== pd.settings.back_url) {
    changeBackground();
  }
  $$(".main_wrapper")[0].style.backgroundColor = pd.settings.back_color;
  if (pd.settings.last_open_tab === MAIN_SETTINGS) {
    const ls = getLocalState();
    openSettingsTab(-1, ls.lastScrollTop);
  }
  lastSettings = { ...pd.settings };
});

let lastDataRefresh = null;

//
ipc.on("player_data_refresh", () => {
  // ignore signal before user login
  if (pd.settings.last_open_tab === MAIN_LOGIN) return;

  // limit refresh to one per second
  const ts = Date.now();
  const lastRefreshTooRecent = lastDataRefresh && ts - lastDataRefresh < 1000;
  if (lastRefreshTooRecent) return;

  const ls = getLocalState();
  updateTopBar();
  // Will not be needed when elements are all reactify'ed
  openTab(pd.settings.last_open_tab, {}, ls.lastDataIndex, ls.lastScrollTop);
  lastDataRefresh = ts;
});

//
ipc.on("set_update_state", function(event, arg) {
  if (pd.settings.last_open_tab === MAIN_UPDATE) {
    openSettingsTab(SETTINGS_ABOUT);
  }
});

//
ipc.on("show_notification", function(event, arg) {
  const notification = $$(".notification")[0];
  notification.style.display = "block";
  notification.title = arg;

  if (arg === "Update available" || arg === "Update downloaded") {
    const handler = () => {
      forceOpenAbout();
      notification.removeEventListener("click", handler);
    };
    notification.addEventListener("click", handler);
  }
});

//
ipc.on("hide_notification", function() {
  const notification = $$(".notification")[0];
  notification.style.display = "none";
  notification.title = "";
});

//
ipc.on("force_open_settings", function() {
  forceOpenSettings();
});

//
ipc.on("force_open_overlay_settings", function(event, arg) {
  setCurrentOverlaySettings(arg);
  forceOpenSettings(SETTINGS_OVERLAY);
});

//
ipc.on("force_open_about", function() {
  forceOpenAbout();
});

//
ipc.on("force_open_tab", function(event, arg) {
  changeBackground("default");
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });

  setLocalState({ lastDataIndex: 0, lastScrollTop: 0 });
  openTab(arg);
  ipcSend("save_user_settings", {
    skip_refresh: true
  });
  updateTopBar();
});

//
ipc.on("prefill_auth_form", function(event, arg) {
  byId("rememberme").checked = arg.remember_me;
  byId("signin_user").value = arg.username;
  byId("signin_pass").value = arg.password;
});

let isNew = false;
//
ipc.on("show_whats_new", function(event, arg) {
  isNew = true;
});

// Seems this is not used anymore?
function rememberMe() {
  const rSettings = {
    remember_me: byId("rememberme").checked
  };
  ipcSend("save_app_settings", rSettings);
}

//
ipc.on("initialize", function() {
  showLoadingBars();
  updateTopBar();

  openTab(pd.settings.last_open_tab);

  if (isNew) {
    ipcSend("save_app_settings", {});
    setTimeout(() => {
      showWhatsNew();
    }, 1000);
  }

  $$(".top_nav")[0].classList.remove("hidden");
  $$(".overflow_ux")[0].classList.remove("hidden");
  $$(".message_center")[0].style.display = "none";
  $$(".init_loading")[0].style.display = "none";
});

//
let logDialogOpen = false;
ipc.on("no_log", function(event, arg) {
  if (loggedIn) {
    $$(".top_nav")[0].classList.add("hidden");
    $$(".overflow_ux")[0].classList.add("hidden");
    $$(".message_center")[0].style.display = "flex";
    $$(".message_center")[0].innerHTML =
      '<div class="message_big red">No Log Found</div><div class="message_sub_16 white">check if it exists at ' +
      arg +
      '</div><div class="message_sub_16 white">if it does, try closing MTG Arena and deleting it.</div>';
  } else if (!logDialogOpen) {
    logDialogOpen = true;
    const cont = createDiv(["dialog_content"]);
    cont.style.width = "650px";
    renderLogInput(cont);
    openDialog(cont, () => (logDialogOpen = false));
  }
});

//
ipc.on("offline", function() {
  showOfflineSplash();
});

//
ipc.on("log_read", function() {
  $$(".top_nav")[0].classList.remove("hidden");
  $$(".overflow_ux")[0].classList.remove("hidden");
  $$(".message_center")[0].style.display = "none";
  $$(".init_loading")[0].style.display = "none";
});

//
ipc.on("popup", function(event, arg, time) {
  pop(arg, time);
});

window.addEventListener("resize", () => {
  hideLoadingBars();
  updateTopBar();
});

function ready(fn) {
  if (
    document.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ipc.on("toggle_login", (event, arg) => {
  loginToggle(arg);
});

function loginToggle(toggle) {
  if (toggle) {
    canLogin = true;
    $$(".login_link")[0].classList.remove("disabled");
  } else {
    canLogin = false;
    $$(".login_link")[0].classList.add("disabled");
  }
}

ready(function() {
  $$(".version_number")[0].innerHTML = `v${remote.app.getVersion()}`;

  $$(".version_number")[0].addEventListener("click", function() {
    forceOpenSettings(SETTINGS_ABOUT);
  });

  $$(".signup_link")[0].addEventListener("click", function() {
    shell.openExternal("https://mtgatool.com/signup/");
  });

  $$(".offline_link")[0].addEventListener("click", function() {
    ipcSend("login", { username: "", password: "" });
  });

  $$(".forgot_link")[0].addEventListener("click", function() {
    shell.openExternal("https://mtgatool.com/resetpassword/");
  });

  function submitAuthenticateForm() {
    if (canLogin) {
      const user = byId("signin_user").value;
      let pass = byId("signin_pass").value;
      if (pass !== HIDDEN_PW) {
        pass = sha1(pass);
      }
      ipcSend("login", { username: user, password: pass });
      loginToggle(false);
    }
  }

  $$("#authenticate_form")[0].addEventListener("submit", e => {
    e.preventDefault();
    submitAuthenticateForm();
  });

  $$(".login_link")[0].addEventListener("click", submitAuthenticateForm);

  //
  $$(".close")[0].addEventListener("click", function() {
    ipcSend("renderer_window_close", 1);
  });

  //
  $$(".minimize")[0].addEventListener("click", function() {
    ipcSend("renderer_window_minimize", 1);
  });

  //
  $$(".settings")[0].addEventListener("click", function() {
    forceOpenSettings();
  });
});

//
ipc.on("set_draft_link", function(event, arg) {
  hideLoadingBars();
  byId("share_input").value = arg;
});

//
ipc.on("set_log_link", function(event, arg) {
  hideLoadingBars();
  byId("share_input").value = arg;
});

//
ipc.on("set_deck_link", function(event, arg) {
  hideLoadingBars();
  byId("share_input").value = arg;
});

//
ipc.on("tou_set", function(event, arg) {
  document.body.style.cursor = "auto";
  tournamentOpen(arg);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
});

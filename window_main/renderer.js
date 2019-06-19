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
const anime = require("animejs");
require("time-elements");

const { HIDDEN_PW } = require("../shared/constants");
const pd = require("../shared/player-data");
const {
  createDiv,
  createInput,
  queryElements: $$
} = require("../shared/dom-fns");
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
  resetMainContainer,
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

const byId = id => document.getElementById(id);
let sidebarActive = -2;
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
ipc.on("player_data_updated", () => {
  if (sidebarActive != -99) {
    $$(".top_username")[0].innerHTML = pd.name.slice(0, -6);
    $$(".top_username_id")[0].innerHTML = pd.name.slice(-6);

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
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: "easeInOutCubic",
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
  if (lastSettings.back_url !== pd.settings.back_url) {
    changeBackground();
  }
  $$(".main_wrapper")[0].style.backgroundColor = pd.settings.back_color;
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
  const notification = $$(".notification")[0];
  notification.style.display = "block";
  notification.title = arg;

  if (arg === "Update available" || arg === "Update downloaded") {
    const handler = () => {
      force_open_about();
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
  byId("rememberme").checked = arg.remember_me;
  byId("signin_user").value = arg.username;
  byId("signin_pass").value = arg.password;
});

//
function rememberMe() {
  const rSettings = {
    remember_me: byId("rememberme").checked
  };
  ipcSend("save_app_settings", rSettings);
}

//
function openTab(tab, filters = {}, dataIndex = 0, scrollTop = 0) {
  showLoadingBars();
  $$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
  let tabClass = "it" + tab;
  resetMainContainer();
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
      tabClass = "ith";
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
      // $$(".message_center")[0].style.display = "initial";
      hideLoadingBars();
      $$(".init_loading")[0].style.display = "block";
      break;
  }
  $$("." + tabClass)[0].classList.add("item_selected");
  ipcSend("save_user_settings", { last_open_tab: tab });
}

//
ipc.on("initialize", function() {
  showLoadingBars();
  if (pd.name) {
    $$(".top_username")[0].innerHTML = pd.name.slice(0, -6);
    $$(".top_username_id")[0].innerHTML = pd.name.slice(-6);
  }

  sidebarActive = pd.settings.last_open_tab;
  const totalAgg = createAllMatches();
  setLocalState({ totalAgg });
  openTab(sidebarActive);

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
    $$(".dialog_wrapper")[0].style.opacity = 1;
    $$(".dialog_wrapper")[0].style.pointerEvents = "all";
    $$(".dialog_wrapper")[0].style.display = "block";
    $$(".dialog")[0].style.width = "600px";
    $$(".dialog")[0].style.height = "200px";
    $$(".dialog")[0].style.top = "calc(50% - 100px)";

    $$(".dialog_wrapper")[0].addEventListener("click", function() {
      // console.log(".dialog_wrapper on click");
      //e.stopPropagation();
      hideDialog();
    });

    $$(".dialog")[0].addEventListener("click", function(e) {
      e.stopPropagation();
      // console.log(".dialog on click");
    });

    const dialog = $$(".dialog")[0];
    dialog.innerHTML = "";

    const cont = createDiv(["dialog_container"]);
    cont.appendChild(
      createDiv(["share_title"], "Enter output_log.txt location:")
    );
    const icd = createDiv(["share_input_container"]);
    const sin = createInput([], "", {
      id: "log_input",
      autofocus: true,
      autocomplete: "off",
      value: arg
    });
    sin.style.borderRadius = "3px";
    sin.style.height = "28px";
    sin.style.fontSize = "14px";
    icd.appendChild(sin);
    cont.appendChild(icd);
    dialog.appendChild(cont);

    const but = createDiv(["button_simple"], "Save");
    but.addEventListener("click", function() {
      ipcSend("set_log", byId("log_input").value);
      // console.log(".dialog_wrapper on click");
      //e.stopPropagation();
      hideDialog();
    });
    dialog.appendChild(but);
  }
});

//
ipc.on("log_ok", function() {
  logDialogOpen = false;
  hideDialog();
});

//
let dialogTimeout = null;
function hideDialog() {
  $$(".dialog_wrapper")[0].style.opacity = 0;
  $$(".dialog_wrapper")[0].style.pointerEvents = "none";
  if (dialogTimeout) clearTimeout(dialogTimeout);
  dialogTimeout = setTimeout(function() {
    $$(".dialog_wrapper")[0].style.display = "none";
    $$(".dialog")[0].style.width = "500px";
    $$(".dialog")[0].style.height = "160px";
    $$(".dialog")[0].style.top = "calc(50% - 80px)";
    logDialogOpen = false;
    dialogTimeout = null;
  }, 250);
}

//
ipc.on("offline", function() {
  showOfflineSplash();
});

//
function showOfflineSplash() {
  hideLoadingBars();
  byId("ux_0").innerHTML =
    '<div class="message_center" style="display: flex; position: fixed;"><div class="message_unlink"></div><div class="message_big red">Oops, you are offline!</div><div class="message_sub_16 white">You can <a class="signup_link">sign up</a> to access online features.</div></div>';
  $$(".signup_link")[0].addEventListener("click", function() {
    shell.openExternal("https://mtgatool.com/signup/");
  });
}

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

//
function force_open_settings(section = -1) {
  sidebarActive = 6;
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: "easeInOutCubic",
    duration: 350
  });
  $$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
  openSettingsTab(section, 0);
}

//
function force_open_about() {
  sidebarActive = 9;
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: "easeInOutCubic",
    duration: 350
  });
  $$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
  openSettingsTab(5, 0);
}

//
let top_compact = false;
let resizeTimer;
window.addEventListener("resize", () => {
  hideLoadingBars();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if ($$(".top_nav_icons")[0].offsetWidth < 530) {
      if (!top_compact) {
        $$("span.top_nav_item_text").forEach(el => (el.style.opacity = 0));
        $$(".top_nav_icon").forEach(el => (el.style.display = "block"));
        $$(".top_nav_icon").forEach(el => (el.style.opacity = 1));
        top_compact = true;
      }
    } else {
      if (top_compact) {
        $$("span.top_nav_item_text").forEach(el => (el.style.opacity = 1));
        $$(".top_nav_icon").forEach(el => (el.style.opacity = 0));
        window.setTimeout(() => {
          $$(".top_nav_icon").forEach(el => (el.style.display = "none"));
        }, 500);
        top_compact = false;
      }
    }
  }, 100);
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

ready(function() {
  $$(".signup_link")[0].addEventListener("click", function() {
    shell.openExternal("https://mtgatool.com/signup/");
  });

  $$(".offline_link")[0].addEventListener("click", function() {
    ipcSend("login", { username: "", password: "" });
    $$(".unlink")[0].style.display = "block";
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
      canLogin = false;
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
    force_open_settings();
  });

  //
  $$(".top_nav_item").forEach(el => {
    el.addEventListener("click", function() {
      changeBackground("default");
      document.body.style.cursor = "auto";
      const classList = [...this.classList];
      if (!classList.includes("item_selected")) {
        anime({
          targets: ".moving_ux",
          left: 0,
          easing: "easeInOutCubic",
          duration: 350
        });
        let filters = {};
        if (classList.includes("ith")) {
          sidebarActive = -1;
        } else if (classList.includes("it0")) {
          sidebarActive = 0;
        } else if (classList.includes("it1")) {
          sidebarActive = 1;
        } else if (classList.includes("it2")) {
          sidebarActive = 2;
        } else if (classList.includes("it3")) {
          sidebarActive = 3;
        } else if (classList.includes("it4")) {
          sidebarActive = 4;
        } else if (classList.includes("it5")) {
          sidebarActive = 5;
        } else if (classList.includes("it6")) {
          sidebarActive = 6;
        } else if (classList.includes("it7")) {
          sidebarActive = 1;
          filters = {
            ...getDefaultFilters(),
            date: DATE_SEASON,
            eventId: RANKED_CONST,
            rankedMode: true
          };
        } else if (classList.includes("it8")) {
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
        anime({
          targets: ".moving_ux",
          left: 0,
          easing: "easeInOutCubic",
          duration: 350
        });
      }
    });
  });
});

//
//ipc.on("show_loading", () => showLoadingBars());

//
//ipc.on("hide_loading", () => hideLoadingBars());

//
ipc.on("set_draft_link", function(event, arg) {
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
    easing: "easeInOutCubic",
    duration: 350
  });
});

/* eslint-disable @typescript-eslint/camelcase */
import "@github/time-elements";
import anime from "animejs";
import { ipcRenderer as ipc, remote, shell } from "electron";
import React from "react";
import {
  EASING_DEFAULT,
  HIDDEN_PW,
  MAIN_EXPLORE,
  MAIN_HOME,
  MAIN_LOGIN,
  MAIN_SETTINGS,
  MAIN_UPDATE,
  SETTINGS_ABOUT,
  SETTINGS_OVERLAY
} from "../shared/constants";
import { createDiv, queryElements as $$ } from "../shared/dom-fns";
import pd from "../shared/player-data";
import {
  compare_cards,
  get_deck_colors,
  removeDuplicates
} from "../shared/util";
import { openDeck } from "./deck-details";
import { setExploreDecks } from "./explore";
import { openHomeTab } from "./home";
import {
  changeBackground,
  getLocalState,
  hideLoadingBars,
  ipcSend,
  openDialog,
  pop,
  renderLogInput,
  setLocalState,
  showLoadingBars,
  showOfflineSplash
} from "./renderer-util";
import { openSettingsTab, setCurrentOverlaySettings } from "./settings";
import { forceOpenAbout, forceOpenSettings, openTab } from "./tabControl";
import { updateTopBar } from "./topNav";
import { tournamentOpen } from "./tournaments";

const sha1 = require("js-sha1");

const byId = (id: string): any => document.getElementById(id);

function handleClearPassword(): void {
  const passwordDiv = byId("signin_pass");
  if (passwordDiv) {
    passwordDiv.value = "";
  }
}

function handleSetDiscordTag(event: unknown, arg: string): void {
  setLocalState({ discordTag: arg });
  if (pd.settings.last_open_tab === MAIN_HOME) {
    openHomeTab(null, true);
  }
}

function handleTooSlow(): void {
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
}

function showLogin(): void {
  $$(".authenticate")[0].style.display = "block";
  $$(".message_center")[0].style.display = "none";
  $$(".init_loading")[0].style.display = "none";
  $$(".button_simple_disabled")[0].classList.add("button_simple");
  byId("signin_user").focus();
}

function handleSetHome(event: unknown, arg: any): void {
  hideLoadingBars();
  if (pd.settings.last_open_tab === MAIN_HOME) {
    // console.log("Home", arg);
    openHomeTab(arg);
  }
}

function handleSetExploreDecks(event: unknown, arg: any): void {
  hideLoadingBars();
  if (pd.settings.last_open_tab === MAIN_EXPLORE) {
    setExploreDecks(arg);
  }
}

function handleOpenCourseDeck(event: unknown, arg: any): void {
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
}

function handleSetUpdateState(): void {
  if (pd.settings.last_open_tab === MAIN_UPDATE) {
    openSettingsTab(SETTINGS_ABOUT);
  }
}

function handleShowNotification(event: unknown, arg: string): void {
  const notification = $$(".notification")[0];
  notification.style.display = "block";
  notification.title = arg;
  if (arg === "Update available" || arg === "Update downloaded") {
    const handler = (): void => {
      forceOpenAbout();
      notification.removeEventListener("click", handler);
    };
    notification.addEventListener("click", handler);
  }
}

function handleHideNotification(): void {
  const notification = $$(".notification")[0];
  notification.style.display = "none";
  notification.title = "";
}

function handleForceOpenSettings(): void {
  forceOpenSettings();
}

function handleForceOpenOverlaySettings(event: unknown, arg: number): void {
  setCurrentOverlaySettings(arg);
  forceOpenSettings(SETTINGS_OVERLAY);
}

function handleForceOpenTab(event: unknown, arg: number): void {
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
    skipRefresh: true
  });
  updateTopBar();
}

function handlePrefillAuthForm(event: unknown, arg: any): void {
  byId("rememberme").checked = arg.remember_me;
  byId("signin_user").value = arg.username;
  byId("signin_pass").value = arg.password;
}

function rememberMe(): void {
  const rSettings = {
    remember_me: byId("rememberme").checked
  };
  ipcSend("save_app_settings", rSettings);
}

function handleInitialize(): void {
  showLoadingBars();
  updateTopBar();
  openTab(pd.settings.last_open_tab);
  $$(".top_nav")[0].classList.remove("hidden");
  $$(".overflow_ux")[0].classList.remove("hidden");
  $$(".message_center")[0].style.display = "none";
  $$(".init_loading")[0].style.display = "none";
}

function handleLogRead(): void {
  $$(".top_nav")[0].classList.remove("hidden");
  $$(".overflow_ux")[0].classList.remove("hidden");
  $$(".message_center")[0].style.display = "none";
  $$(".init_loading")[0].style.display = "none";
}

function handlePopup(event: unknown, arg: string, time: number): void {
  pop(arg, time);
}

window.addEventListener("resize", () => {
  hideLoadingBars();
  updateTopBar();
});

function handleSetDraftLink(event: unknown, arg: string): void {
  hideLoadingBars();
  byId("share_input").value = arg;
}

function handleSetLogLink(event: unknown, arg: string): void {
  hideLoadingBars();
  byId("share_input").value = arg;
}

function handleSetDeckLink(event: unknown, arg: string): void {
  hideLoadingBars();
  byId("share_input").value = arg;
}

function handleTouSet(event: unknown, arg: any): void {
  document.body.style.cursor = "auto";
  tournamentOpen(arg);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

/**
 * This is the React control component at the root of the main renderer process.
 * It should handle all of the IPC traffic with other processes and manage all
 * of the state for the main window process (except for player-data, which
 * still handles "set_player_data").
 */
export default function MainController(): JSX.Element {
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [canLogin, setCanLogin] = React.useState(false);
  const [logDialogOpen, setLogDialogOpen] = React.useState(false);
  const [lastSettings, setLastSettings] = React.useState(
    {} as Record<string, any>
  );
  const [lastDataRefresh, setLastDataRefresh] = React.useState(NaN);

  function handleAuth(event: unknown, arg: any): void {
    setLocalState({ authToken: arg.token });
    if (arg.ok) {
      $$(".message_center")[0].style.display = "flex";
      $$(".authenticate")[0].style.display = "none";
      setLoggedIn(true);
    } else {
      setCanLogin(true);
      ipcSend("renderer_show");
      pop(arg.error, -1);
    }
  }

  function handleShowLogin(): void {
    setCanLogin(true);
    showLogin();
  }

  function handleSettingsUpdated(): void {
    const cardQuantityWidth = Math.min(pd.cardsSizeHoverCard - 24, 180);

    $$(".hover_card_quantity")[0].style.left =
      cardQuantityWidth +
      (pd.cardsSizeHoverCard - cardQuantityWidth) / 2 +
      "px";
    $$(".hover_card_quantity")[0].style.width = cardQuantityWidth + "px";

    $$(".main_hover")[0].style.width = pd.cardsSizeHoverCard + "px";
    $$(".main_hover")[0].style.height =
      pd.cardsSizeHoverCard / 0.71808510638 + "px";

    $$(".main_hover_dfc")[0].style.width = pd.cardsSizeHoverCard + "px";
    $$(".main_hover_dfc")[0].style.height =
      pd.cardsSizeHoverCard / 0.71808510638 + "px";

    $$(".loader")[0].style.width = pd.cardsSizeHoverCard + "px";
    $$(".loader")[0].style.height =
      pd.cardsSizeHoverCard / 0.71808510638 + "px";

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
    setLastSettings({ ...pd.settings });
  }

  function handlePlayerDataRefresh(): void {
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
    setLastDataRefresh(ts);
  }

  function handleNoLog(event: unknown, arg: any): void {
    if (loggedIn) {
      $$(".top_nav")[0].classList.add("hidden");
      $$(".overflow_ux")[0].classList.add("hidden");
      $$(".message_center")[0].style.display = "flex";
      $$(".message_center")[0].innerHTML =
        '<div class="message_big red">No Log Found</div><div class="message_sub_16 white">check if it exists at ' +
        arg +
        '</div><div class="message_sub_16 white">if it does, try closing MTG Arena and deleting it.</div>';
    } else if (!logDialogOpen) {
      setLogDialogOpen(true);
      const cont = createDiv(["dialog_content"]);
      cont.style.width = "650px";
      renderLogInput(cont);
      openDialog(cont, () => setLogDialogOpen(false));
    }
  }

  function loginToggle(toggle: boolean): void {
    if (toggle) {
      setCanLogin(true);
      $$(".login_link")[0].classList.remove("disabled");
    } else {
      setCanLogin(false);
      $$(".login_link")[0].classList.add("disabled");
    }
  }

  function submitAuthenticateForm(): void {
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

  function handleToggleLogin(event: unknown, arg: boolean): void {
    loginToggle(arg);
  }

  const ipcRoutes: Record<string, (event: unknown, ...arg: any) => void> = {
    clear_pwd: handleClearPassword,
    auth: handleAuth,
    set_discord_tag: handleSetDiscordTag,
    too_slow: handleTooSlow,
    show_login: handleShowLogin,
    set_home: handleSetHome,
    set_explore_decks: handleSetExploreDecks,
    settings_updated: handleSettingsUpdated,
    player_data_refresh: handlePlayerDataRefresh,
    no_log: handleNoLog,
    toggle_login: handleToggleLogin,
    open_course_deck: handleOpenCourseDeck,
    set_update_state: handleSetUpdateState,
    show_notification: handleShowNotification,
    hide_notification: handleHideNotification,
    force_open_settings: handleForceOpenSettings,
    force_open_overlay_settings: handleForceOpenOverlaySettings,
    force_open_about: forceOpenAbout,
    force_open_tab: handleForceOpenTab,
    prefill_auth_form: handlePrefillAuthForm,
    initialize: handleInitialize,
    offline: showOfflineSplash,
    log_read: handleLogRead,
    popup: handlePopup,
    set_draft_link: handleSetDraftLink,
    set_log_link: handleSetLogLink,
    set_deck_link: handleSetDeckLink,
    tou_set: handleTouSet
  };
  React.useEffect(() => {
    // register all IPC listeners
    Object.entries(ipcRoutes).forEach(([event, handler]) =>
      ipc.on(event, handler)
    );

    // unregister all IPC listeners
    return (): void => {
      Object.entries(ipcRoutes).forEach(([event, handler]) =>
        ipc.removeListener(event, handler)
      );
    };
  });

  React.useEffect(() => {
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
    $$("#authenticate_form")[0].addEventListener("submit", (e: any) => {
      e.preventDefault();
      submitAuthenticateForm();
    });
    $$(".login_link")[0].addEventListener("click", submitAuthenticateForm);
    $$(".close")[0].addEventListener("click", function() {
      ipcSend("renderer_window_close", 1);
    });
    $$(".minimize")[0].addEventListener("click", function() {
      ipcSend("renderer_window_minimize", 1);
    });
    $$(".settings")[0].addEventListener("click", function() {
      forceOpenSettings();
    });
  });

  return (
    <>
      <div className="main_wrapper main_bg_image" />
      <div className="outer_wrapper">
        <div className="dialog_wrapper">
          <div className="dialog" />
        </div>

        <div className="top">
          <div className="flex_item">
            <div className="top_logo" />
            <div className="top_artist">Bedevil by Seb McKinnon</div>
          </div>
          <div className="flex_item">
            <div className="unlink" title="You are not logged-in." />
            <div className="notification" />
            <div className="button minimize" />
            <div className="button settings" />
            <div className="button close" />
          </div>
        </div>
        <div className="top_nav_container" />

        <div
          className="loading_bar_main main_loading"
          style={{ display: "none" }}
        >
          <div className="loading_color loading_w" />
          <div className="loading_color loading_u" />
          <div className="loading_color loading_b" />
          <div className="loading_color loading_r" />
          <div className="loading_color loading_g" />
        </div>

        <div className="popup" />

        <div className="wrapper">
          <div className="loading_bar init_loading">
            <div className="loading_color loading_w" />
            <div className="loading_color loading_u" />
            <div className="loading_color loading_b" />
            <div className="loading_color loading_r" />
            <div className="loading_color loading_g" />
          </div>

          <div className="overflow_ux hidden">
            <div className="moving_ux">
              <div className="ux_item" id="ux_0" />
              <div className="ux_item" id="ux_1" />
              <div className="ux_item" id="ux_2" />
            </div>
          </div>

          <div className="main_hover_container">
            <div className="hover_card_quantity" style={{ opacity: 0 }} />
            <img className="main_hover" style={{ opacity: 0 }} />
            <img className="main_hover_dfc" style={{ opacity: 0 }} />
          </div>
          <div className="main_hover_container">
            <img className="loader" src="../images/nocard.png" />
            <img className="loader_dfc" src="../images/nocard.png" />
          </div>

          <div className="message_center">
            <div className="message_big red">Loading</div>
            <div className="message_sub white">Just a moment..</div>
          </div>

          <form id="authenticate_form" className="authenticate">
            <div className="message_big green">Welcome!</div>
            <label style={{ display: "table" }}>Email</label>
            <div className="input_login_container">
              <input type="username" id="signin_user" autoComplete="off" />
            </div>
            <label style={{ display: "table" }}>Password</label>
            <div className="input_login_container">
              <input type="password" id="signin_pass" autoComplete="off" />
            </div>
            <div className="button_simple_disabled centered login_link">
              Login
            </div>
            <input type="submit" style={{ display: "none" }} />
            <label className="check_container check_container_centered hover_label">
              Remember me?
              <input type="checkbox" id="rememberme" onClick={rememberMe} />
              <span className="checkmark"></span>
            </label>
            <div className="message_small">
              Dont have an account? <a className="signup_link">Sign up!</a>
            </div>
            <div className="message_small">
              You can also <a className="offline_link">continue offline</a>
            </div>
            <div className="message_small">
              Did you <a className="forgot_link">forget your password?</a>
            </div>
          </form>
        </div>

        <div className="version_number" />
      </div>
    </>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-console */
import { ipcRenderer as ipc } from "electron";
import {
  dispatchAction,
  SET_LOGIN_FORM,
  SET_LOGIN_PASS,
  SET_LOGIN_STATE,
  LOGIN_OK,
  LOGIN_FAILED,
  LOGIN_WAITING,
  SET_LOADING,
  SET_OFFLINE,
  SET_CAN_LOGIN,
  SET_HOME_DATA,
  SET_POPUP,
  SET_TOP_NAV,
  SET_PATREON,
  SET_BACKGROUND_IMAGE,
  SET_HOVER_SIZE,
  SET_EXPLORE_DATA,
  SET_EXPLORE_FILTERS_SKIP,
  SET_UPDATE_STATE,
  SET_NO_LOG
} from "./reducers";
import { timestamp } from "../../shared/util";
import {
  MAIN_SETTINGS,
  SETTINGS_OVERLAY,
  MAIN_HOME
} from "../../shared/constants";
import { ipcSend } from "../renderer-util";
import { SETTINGS_ABOUT } from "../../shared/constants";
import pd from "../../shared/PlayerData";
import uxMove from "../uxMove";

export default function ipcListeners(dispatcher: unknown): void {
  console.log("Set up IPC listeners.");

  ipc.on("show_login", (): void => {
    //  canLogin = true;
    //  showLogin();
  });

  ipc.on("prefill_auth_form", (event: string, arg: any): void => {
    dispatchAction(dispatcher, SET_LOGIN_FORM, {
      email: arg.username,
      pass: arg.password,
      rememberme: arg.remember_me
    });
  });

  ipc.on("clear_pwd", (): void => {
    dispatchAction(dispatcher, SET_LOGIN_PASS, "");
  });

  ipc.on("login_failed", (): void => {
    dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_FAILED);
  });

  ipc.on("begin_login", (): void => {
    dispatchAction(dispatcher, SET_LOADING, true);
    dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_WAITING);
  });

  ipc.on("auth", (event: string, arg: any): void => {
    dispatchAction(dispatcher, SET_LOADING, true);
    if (arg.ok) {
      dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_WAITING);
      if (arg.user == -1) {
        dispatchAction(dispatcher, SET_OFFLINE, true);
      }
      if (arg.patreon) {
        dispatchAction(dispatcher, SET_PATREON, {
          patreon: arg.patreon,
          patreonTier: arg.patreon_tier
        });
      }
    } else {
      dispatchAction(dispatcher, SET_LOADING, false);
      dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_FAILED);
    }
  });

  ipc.on("initialize", (): void => {
    dispatchAction(dispatcher, SET_LOADING, false);
    dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_OK);
  });

  ipc.on("offline", (): void => {
    dispatchAction(dispatcher, SET_OFFLINE, true);
  });

  ipc.on("show_loading", (): void => {
    dispatchAction(dispatcher, SET_LOADING, true);
  });

  ipc.on("hide_loading", (): void => {
    dispatchAction(dispatcher, SET_LOADING, false);
  });

  ipc.on("show_login", (): void => {
    //showLogin();
  });

  ipc.on("toggle_login", (event: string, arg: any): void => {
    dispatchAction(dispatcher, SET_CAN_LOGIN, arg);
  });

  ipc.on("popup", (event: string, text: string, time: number): void => {
    const newTime = timestamp() + time;
    dispatchAction(dispatcher, SET_POPUP, {
      text: text,
      time: newTime,
      duration: time
    });
  });

  ipc.on("force_open_settings", (): void => {
    uxMove(0);
    dispatchAction(dispatcher, SET_TOP_NAV, MAIN_SETTINGS);
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS
    });
  });

  ipc.on("force_open_overlay_settings", (event: string, arg: number): void => {
    uxMove(0);
    dispatchAction(dispatcher, SET_TOP_NAV, SETTINGS_OVERLAY);
    ipcSend("save_user_settings", {
      last_open_tab: SETTINGS_OVERLAY,
      last_settings_section: arg
    });
  });

  ipc.on("force_open_about", (): void => {
    uxMove(0);
    dispatchAction(dispatcher, SET_TOP_NAV, MAIN_SETTINGS);
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS,
      last_settings_section: SETTINGS_ABOUT
    });
  });

  ipc.on("set_home", (event: string, arg: any): void => {
    dispatchAction(dispatcher, SET_LOADING, false);
    console.log("Home", arg);
    dispatchAction(dispatcher, SET_HOME_DATA, {
      wildcards: arg.wildcards,
      filteredSet: arg.filtered_set,
      usersActive: arg.users_active
    });
  });

  ipc.on("set_explore_decks", (event: string, arg: any): void => {
    console.log("Explore", arg);
    dispatchAction(dispatcher, SET_LOADING, false);
    dispatchAction(dispatcher, SET_EXPLORE_DATA, arg);
    dispatchAction(dispatcher, SET_EXPLORE_FILTERS_SKIP, arg.results_number);
  });

  ipc.on("set_update_state", (event: string, arg: any): void => {
    dispatchAction(dispatcher, SET_UPDATE_STATE, arg);
  });

  ipc.on("settings_updated", (): void => {
    dispatchAction(
      dispatcher,
      SET_TOP_NAV,
      pd.settings.last_open_tab || MAIN_HOME
    );
    dispatchAction(dispatcher, SET_BACKGROUND_IMAGE, pd.settings.back_url);
    dispatchAction(dispatcher, SET_HOVER_SIZE, pd.cardsSizeHoverCard);
  });

  ipc.on("no_log", (): void => {
    dispatchAction(dispatcher, SET_NO_LOG, true);
  });
}

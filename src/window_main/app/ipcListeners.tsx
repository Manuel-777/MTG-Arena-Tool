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
  SET_TOP_NAV
} from "./ContextReducer";
import { timestamp } from "../../shared/util";
import { MAIN_SETTINGS, SETTINGS_OVERLAY } from "../../shared/constants";
import { ipcSend } from "../renderer-util";
import { SETTINGS_ABOUT } from "../../shared/constants";

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

  ipc.on("auth", (event: string, arg: any): void => {
    console.log("IPC auth", arg);
    dispatchAction(dispatcher, SET_LOADING, true);
    if (arg.ok) {
      dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_WAITING);
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
    dispatchAction(dispatcher, SET_POPUP, { text: text, time: newTime });
  });

  ipc.on("force_open_settings", (): void => {
    dispatchAction(dispatcher, SET_TOP_NAV, MAIN_SETTINGS);
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS
    });
  });

  ipc.on("force_open_overlay_settings", (event: string, arg: number): void => {
    dispatchAction(dispatcher, SET_TOP_NAV, SETTINGS_OVERLAY);
    ipcSend("save_user_settings", {
      last_open_tab: SETTINGS_OVERLAY,
      last_settings_section: arg
    });
  });

  ipc.on("force_open_about", (): void => {
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
}

/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-console */
import { ipcRenderer as ipc } from "electron";
import fs from "fs";
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
  SET_BACKGROUND_IMAGE,
  SET_TOP_ARTIST,
  SET_ANY,
  SET_PATREON
} from "./ContextReducer";
import { timestamp, getCardArtCrop } from "../../shared/util";
import { MAIN_SETTINGS, SETTINGS_OVERLAY } from "../../shared/constants";
import { ipcSend } from "../renderer-util";
import { SETTINGS_ABOUT } from "../../shared/constants";
import pd from "../../shared/player-data";
import db from "../../shared/database";
const DEFAULT_BACKGROUND = "../../images/Bedevil-Art.jpg";

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

  ipc.on("settings_updated", (): void => {
    // Compute new artist and background image
    const backUrl = pd.settings.back_url;
    const card = db.card(backUrl);
    let backgroundImage = "";
    let artist = "";
    if (backUrl === "default") {
      if (pd.settings.back_url && pd.settings.back_url !== "default") {
        backgroundImage = "url(" + pd.settings.back_url + ")";
      } else {
        artist = "Bedevil by Seb McKinnon";
        backgroundImage = "url(" + DEFAULT_BACKGROUND + ")";
      }
    } else if (card) {
      backgroundImage = `url(${getCardArtCrop(card)})`;
      try {
        artist = card.name + " by " + card.artist;
      } catch (e) {
        console.log(e);
      }
    } else if (fs.existsSync(backUrl)) {
      backgroundImage = "url(" + backUrl + ")";
    } else {
      const xhr = new XMLHttpRequest();
      xhr.open("HEAD", backUrl);
      xhr.onload = (): void => {
        if (xhr.status === 200) {
          backgroundImage = "url(" + backUrl + ")";
        } else {
          backgroundImage = "";
        }
      };
      xhr.send();
    }

    dispatchAction(dispatcher, SET_ANY, {
      topNav: pd.settings.last_open_tab,
      backgroundImage: backgroundImage,
      topArtist: artist
    });
    /*
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
      openSettingsTab(-1);
    }
    lastSettings = {...pd.settings};
    */
  });
}

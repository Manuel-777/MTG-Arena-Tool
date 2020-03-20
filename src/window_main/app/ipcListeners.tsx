/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-console */
import { ipcRenderer as ipc, IpcRendererEvent } from "electron";
import {
  dispatchAction,
  SET_LOGIN_FORM,
  SET_LOGIN_PASS,
  SET_LOGIN_STATE,
  LOGIN_OK,
  LOGIN_FAILED,
  LOGIN_WAITING,
  SET_OFFLINE,
  SET_CAN_LOGIN,
  SET_HOME_DATA,
  SET_POPUP,
  SET_PATREON,
  SET_SETTINGS,
  SET_UPDATE_STATE,
  SET_NO_LOG,
  SET_SHARE_DIALOG_URL,
  loadingSlice,
  exploreSlice,
  topNavSlice,
  hoverSlice
} from "../../shared/redux/reducers";
import { timestamp } from "../../shared/util";
import {
  MAIN_SETTINGS,
  SETTINGS_OVERLAY,
  MAIN_HOME
} from "../../shared/constants";
import { ipcSend } from "../rendererUtil";
import { SETTINGS_ABOUT } from "../../shared/constants";
import pd from "../../shared/PlayerData";
import uxMove from "../uxMove";

export default function ipcListeners(dispatcher: any): void {
  console.log("Set up IPC listeners.");
  const { setTopNav } = topNavSlice.actions;
  const {
    setActiveEvents,
    setExploreData,
    setExploreFiltersSkip
  } = exploreSlice.actions;
  const { setHoverSize } = hoverSlice.actions;

  const { setLoading } = loadingSlice.actions;

  ipc.on("prefill_auth_form", (event: IpcRendererEvent, arg: any): void => {
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
    dispatcher(setLoading(true));
    dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_WAITING);
  });

  ipc.on("auth", (event: IpcRendererEvent, arg: any): void => {
    dispatcher(setLoading(true));
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
      dispatcher(setLoading(false));
      dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_FAILED);
    }
  });

  ipc.on("initialize", (): void => {
    dispatcher(setLoading(false));
    dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_OK);
  });

  ipc.on("offline", (): void => {
    dispatchAction(dispatcher, SET_OFFLINE, true);
  });

  ipc.on("toggle_login", (event: IpcRendererEvent, arg: any): void => {
    dispatchAction(dispatcher, SET_CAN_LOGIN, arg);
  });

  ipc.on(
    "popup",
    (event: IpcRendererEvent, text: string, time: number): void => {
      const newTime = timestamp() + time;
      dispatchAction(dispatcher, SET_POPUP, {
        text: text,
        time: newTime,
        duration: time
      });
    }
  );

  ipc.on(
    "force_open_settings",
    (event: IpcRendererEvent, arg?: number): void => {
      uxMove(0);
      dispatcher(setTopNav(MAIN_SETTINGS));
      if (arg === -1) {
        ipcSend("save_user_settings", { last_open_tab: MAIN_SETTINGS });
      } else {
        ipcSend("save_user_settings", {
          last_open_tab: MAIN_SETTINGS,
          last_settings_section: arg
        });
      }
    }
  );

  ipc.on(
    "force_open_overlay_settings",
    (event: IpcRendererEvent, arg: number): void => {
      uxMove(0);
      dispatcher(setTopNav(MAIN_SETTINGS));
      ipcSend("save_user_settings", {
        last_open_tab: MAIN_SETTINGS,
        last_settings_section: SETTINGS_OVERLAY,
        last_settings_overlay_section: arg
      });
    }
  );

  ipc.on("force_open_about", (): void => {
    uxMove(0);
    dispatcher(setTopNav(MAIN_SETTINGS));
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS,
      last_settings_section: SETTINGS_ABOUT
    });
  });

  ipc.on("set_home", (event: IpcRendererEvent, arg: any): void => {
    dispatcher(setLoading(false));
    console.log("Home", arg);
    dispatchAction(dispatcher, SET_HOME_DATA, {
      wildcards: arg.wildcards,
      filteredSet: arg.filtered_set,
      usersActive: arg.users_active
    });
  });

  ipc.on("set_explore_decks", (event: IpcRendererEvent, arg: any): void => {
    console.log("Explore", arg);
    dispatcher(setLoading(false));
    dispatcher(setExploreData(arg));
    dispatcher(setExploreFiltersSkip(arg.results_number));
  });

  ipc.on("set_update_state", (event: IpcRendererEvent, arg: any): void => {
    dispatchAction(dispatcher, SET_UPDATE_STATE, arg);
  });

  ipc.on("settings_updated", (): void => {
    dispatcher(setTopNav(pd.settings.last_open_tab ?? MAIN_HOME));
    dispatcher(setHoverSize(pd.cardsSizeHoverCard));
    dispatchAction(dispatcher, SET_SETTINGS, pd.settings);
  });

  ipc.on("no_log", (): void => {
    dispatchAction(dispatcher, SET_NO_LOG, true);
  });

  ipc.on("set_draft_link", function(event: IpcRendererEvent, arg: string) {
    dispatchAction(dispatcher, SET_SHARE_DIALOG_URL, arg);
    dispatcher(setLoading(false));
  });

  ipc.on("set_log_link", function(event: IpcRendererEvent, arg: string) {
    dispatchAction(dispatcher, SET_SHARE_DIALOG_URL, arg);
    dispatcher(setLoading(false));
  });

  ipc.on("set_deck_link", function(event: IpcRendererEvent, arg: string) {
    dispatchAction(dispatcher, SET_SHARE_DIALOG_URL, arg);
    dispatcher(setLoading(false));
  });

  ipc.on("set_active_events", function(event: IpcRendererEvent, arg: string) {
    if (!arg) return;
    try {
      const activeEvents = JSON.parse(arg);
      dispatcher(setActiveEvents(activeEvents));
    } catch (e) {
      console.log("(set_active_events) Error parsing JSON:", arg);
    }
  });
}

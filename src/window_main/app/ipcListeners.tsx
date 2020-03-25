/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-console */
import { ipcRenderer as ipc, IpcRendererEvent } from "electron";
import {
  LOGIN_OK,
  LOGIN_FAILED,
  LOGIN_WAITING,
  exploreSlice,
  homeSlice,
  hoverSlice,
  loginSlice,
  rendererSlice,
  settingsSlice
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
  const { setHomeData } = homeSlice.actions;
  const {
    setActiveEvents,
    setExploreData,
    setExploreFiltersSkip
  } = exploreSlice.actions;
  const { setHoverSize } = hoverSlice.actions;
  const {
    setCanLogin,
    setLoginForm,
    setLoginPassword,
    setLoginState
  } = loginSlice.actions;
  const {
    setLoading,
    setOffline,
    setNoLog,
    setPatreon,
    setPlayerDataTimestamp,
    setPopup,
    setShareDialogUrl,
    setTopNav,
    setUpdateState
  } = rendererSlice.actions;
  const { setSettings } = settingsSlice.actions;

  ipc.on("prefill_auth_form", (event: IpcRendererEvent, arg: any): void => {
    dispatcher(
      setLoginForm({
        email: arg.username,
        pass: arg.password,
        rememberme: arg.remember_me
      })
    );
  });

  ipc.on("clear_pwd", (): void => {
    dispatcher(setLoginPassword(""));
  });

  ipc.on("login_failed", (): void => {
    dispatcher(setLoginState(LOGIN_FAILED));
  });

  ipc.on("begin_login", (): void => {
    dispatcher(setLoading(true));
    dispatcher(setLoginState(LOGIN_WAITING));
  });

  ipc.on("auth", (event: IpcRendererEvent, arg: any): void => {
    dispatcher(setLoading(true));
    if (arg.ok) {
      dispatcher(setLoginState(LOGIN_WAITING));
      if (arg.user == -1) {
        dispatcher(setOffline(true));
      }
      if (arg.patreon) {
        dispatcher(
          setPatreon({
            patreon: arg.patreon,
            patreonTier: arg.patreon_tier
          })
        );
      }
    } else {
      dispatcher(setLoading(false));
      dispatcher(setLoginState(LOGIN_FAILED));
    }
  });

  ipc.on("initialize", (): void => {
    dispatcher(setLoading(false));
    dispatcher(setLoginState(LOGIN_OK));
  });

  ipc.on("offline", (): void => {
    dispatcher(setOffline(true));
  });

  ipc.on("toggle_login", (event: IpcRendererEvent, arg: any): void => {
    dispatcher(setCanLogin(arg));
  });

  ipc.on(
    "popup",
    (event: IpcRendererEvent, text: string, time: number): void => {
      const newTime = timestamp() + time;
      dispatcher(
        setPopup({
          text: text,
          time: newTime,
          duration: time
        })
      );
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
    dispatcher(
      setHomeData({
        wildcards: arg.wildcards,
        filteredSet: arg.filtered_set,
        usersActive: arg.users_active
      })
    );
  });

  ipc.on("set_explore_decks", (event: IpcRendererEvent, arg: any): void => {
    console.log("Explore", arg);
    dispatcher(setLoading(false));
    dispatcher(setExploreData(arg));
    dispatcher(setExploreFiltersSkip(arg.results_number));
  });

  ipc.on("set_update_state", (event: IpcRendererEvent, arg: any): void => {
    dispatcher(setUpdateState(arg));
  });

  ipc.on("settings_updated", (): void => {
    dispatcher(setTopNav(pd.settings.last_open_tab ?? MAIN_HOME));
    dispatcher(setHoverSize(pd.cardsSizeHoverCard));
    dispatcher(setSettings(pd.settings));
  });

  ipc.on("set_player_data", (event: IpcRendererEvent, arg: any): void => {
    try {
      const payload = JSON.parse(arg);
      // only update the timestamp for data, not settings
      const keys = Object.keys(payload);
      const isMoreThanJustSettings =
        keys.length > 1 || !keys.includes("settings");
      if (isMoreThanJustSettings) {
        dispatcher(setPlayerDataTimestamp(Date.now()));
      }
    } catch (e) {
      console.log("Unable to parse player data", e);
    }
  });

  ipc.on("no_log", (): void => {
    dispatcher(setNoLog(true));
  });

  ipc.on("set_draft_link", function(event: IpcRendererEvent, arg: string) {
    dispatcher(setShareDialogUrl(arg));
    dispatcher(setLoading(false));
  });

  ipc.on("set_log_link", function(event: IpcRendererEvent, arg: string) {
    dispatcher(setShareDialogUrl(arg));
    dispatcher(setLoading(false));
  });

  ipc.on("set_deck_link", function(event: IpcRendererEvent, arg: string) {
    dispatcher(setShareDialogUrl(arg));
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

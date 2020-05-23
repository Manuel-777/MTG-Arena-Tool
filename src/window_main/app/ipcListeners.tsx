/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-console */
import { ipcRenderer as ipc, IpcRendererEvent } from "electron";
import { timestamp } from "../../shared/util";
import {
  MAIN_SETTINGS,
  SETTINGS_OVERLAY,
  IPC_NONE
} from "../../shared/constants";
import { ipcSend } from "../rendererUtil";
import {
  LOGIN_FAILED,
  LOGIN_WAITING,
  SETTINGS_ABOUT
} from "../../shared/constants";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { AnyAction, Dispatch } from "redux";

export default function ipcListeners(dispatcher: Dispatch<AnyAction>): void {
  console.log("Set up IPC listeners.");

  ipc.on("prefill_auth_form", (event: IpcRendererEvent, arg: any): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_LOGIN_FORM",
        arg: {
          email: arg.username,
          pass: arg.password,
          rememberme: arg.rememberMe
        }
      },
      "SET_LOGIN_FORM",
      {
        email: arg.username,
        pass: arg.password,
        rememberme: arg.rememberMe
      },
      IPC_NONE
    );
  });

  ipc.on("clear_pwd", (): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_LOGIN_PASSWORD",
        arg: ""
      },
      "SET_LOGIN_PASSWORD",
      "",
      IPC_NONE
    );
  });

  ipc.on("login_failed", (): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_LOGIN_STATE",
        arg: LOGIN_FAILED
      },
      "SET_LOGIN_STATE",
      LOGIN_FAILED,
      IPC_NONE
    );
  });

  ipc.on("begin_login", (): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: true
      },
      "SET_LOADING",
      true,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_LOGIN_STATE",
        arg: LOGIN_WAITING
      },
      "SET_LOGIN_STATE",
      LOGIN_WAITING,
      IPC_NONE
    );
  });

  ipc.on("auth", (event: IpcRendererEvent, arg: any): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: true
      },
      "SET_LOADING",
      true,
      IPC_NONE
    );
    if (arg.ok) {
      reduxAction(
        dispatcher,
        {
          type: "SET_LOGIN_STATE",
          arg: LOGIN_WAITING
        },
        "SET_LOGIN_STATE",
        LOGIN_WAITING,
        IPC_NONE
      );
      if (arg.user == -1) {
        reduxAction(
          dispatcher,
          {
            type: "SET_OFFLINE",
            arg: true
          },
          "SET_OFFLINE",
          true,
          IPC_NONE
        );
      }
      if (arg.patreon) {
        reduxAction(
          dispatcher,
          {
            type: "SET_PATREON",
            arg: {
              patreon: arg.patreon,
              patreonTier: arg.patreon_tier
            }
          },
          "SET_PATREON",
          {
            patreon: arg.patreon,
            patreonTier: arg.patreon_tier
          },
          IPC_NONE
        );
      }
    } else {
      reduxAction(
        dispatcher,
        {
          type: "SET_LOADING",
          arg: false
        },
        "SET_LOADING",
        false,
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        {
          type: "SET_LOGIN_STATE",
          arg: LOGIN_FAILED
        },
        "SET_LOGIN_STATE",
        LOGIN_FAILED,
        IPC_NONE
      );
    }
  });

  ipc.on("offline", (): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_OFFLINE",
        arg: true
      },
      "SET_OFFLINE",
      true,
      IPC_NONE
    );
  });

  ipc.on("toggle_login", (event: IpcRendererEvent, arg: any): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_CAN_LOGIN",
        arg: arg
      },
      "SET_CAN_LOGIN",
      arg,
      IPC_NONE
    );
  });

  ipc.on(
    "popup",
    (event: IpcRendererEvent, text: string, time: number): void => {
      const newTime = timestamp() + time;
      reduxAction(
        dispatcher,
        {
          type: "SET_POPUP",
          arg: {
            text: text,
            time: newTime,
            duration: time
          }
        },
        "SET_POPUP",
        {
          text: text,
          time: newTime,
          duration: time
        },
        IPC_NONE
      );
    }
  );

  ipc.on(
    "force_open_settings",
    (event: IpcRendererEvent, arg?: number): void => {
      reduxAction(
        dispatcher,
        {
          type: "SET_TOPNAV",
          arg: MAIN_SETTINGS
        },
        "SET_TOPNAV",
        MAIN_SETTINGS,
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        {
          type: "SET_NAV_INDEX",
          arg: 0
        },
        "SET_NAV_INDEX",
        0,
        IPC_NONE
      );
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
      reduxAction(
        dispatcher,
        {
          type: "SET_NAV_INDEX",
          arg: 0
        },
        "SET_NAV_INDEX",
        0,
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        {
          type: "SET_TOPNAV",
          arg: MAIN_SETTINGS
        },
        "SET_TOPNAV",
        MAIN_SETTINGS,
        IPC_NONE
      );
      ipcSend("save_user_settings", {
        last_open_tab: MAIN_SETTINGS,
        last_settings_section: SETTINGS_OVERLAY,
        last_settings_overlay_section: arg
      });
    }
  );

  ipc.on("force_open_about", (): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_NAV_INDEX",
        arg: 0
      },
      "SET_NAV_INDEX",
      0,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_TOPNAV",
        arg: MAIN_SETTINGS
      },
      "SET_TOPNAV",
      MAIN_SETTINGS,
      IPC_NONE
    );
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS,
      last_settings_section: SETTINGS_ABOUT
    });
  });

  ipc.on("set_home", (event: IpcRendererEvent, arg: any): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: false
      },
      "SET_LOADING",
      false,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_HOME_DATA",
        arg: {
          wildcards: arg.wildcards,
          filteredSet: arg.filtered_set,
          usersActive: arg.users_active
        }
      },
      "SET_HOME_DATA",
      {
        wildcards: arg.wildcards,
        filteredSet: arg.filtered_set,
        usersActive: arg.users_active
      },
      IPC_NONE
    );
    console.log("Home", arg);
  });

  ipc.on("set_explore_decks", (event: IpcRendererEvent, arg: any): void => {
    console.log("Explore", arg);
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: false
      },
      "SET_LOADING",
      false,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_EXPLORE_DATA",
        arg: arg
      },
      "SET_EXPLORE_DATA",
      arg,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_EXPLORE_FILTERS_SKIP",
        arg: arg.results_number
      },
      "SET_EXPLORE_FILTERS_SKIP",
      arg.results_number,
      IPC_NONE
    );
  });

  ipc.on("set_update_state", (event: IpcRendererEvent, arg: any): void => {
    reduxAction(
      dispatcher,
      {
        type: "SET_UPDATE_STATE",
        arg: arg
      },
      "SET_UPDATE_STATE",
      arg,
      IPC_NONE
    );
  });

  ipc.on("no_log", function(event: IpcRendererEvent, arg: string) {
    if (arg) {
      reduxAction(
        dispatcher,
        {
          type: "SET_APP_SETTINGS",
          arg: {
            logUri: arg
          }
        },
        "SET_APP_SETTINGS",
        { logUri: arg },
        IPC_NONE
      );
    }
    reduxAction(
      dispatcher,
      {
        type: "SET_NO_LOG",
        arg: true
      },
      "SET_NO_LOG",
      true,
      IPC_NONE
    );
  });

  ipc.on("set_draft_link", function(event: IpcRendererEvent, arg: string) {
    reduxAction(
      dispatcher,
      {
        type: "SET_SHARE_DIALOG_URL",
        arg: arg
      },
      "SET_SHARE_DIALOG_URL",
      arg,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: false
      },
      "SET_LOADING",
      false,
      IPC_NONE
    );
  });

  ipc.on("set_log_link", function(event: IpcRendererEvent, arg: string) {
    reduxAction(
      dispatcher,
      {
        type: "SET_SHARE_DIALOG_URL",
        arg: arg
      },
      "SET_SHARE_DIALOG_URL",
      arg,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: false
      },
      "SET_LOADING",
      false,
      IPC_NONE
    );
  });

  ipc.on("set_deck_link", function(event: IpcRendererEvent, arg: string) {
    reduxAction(
      dispatcher,
      {
        type: "SET_SHARE_DIALOG_URL",
        arg: arg
      },
      "SET_SHARE_DIALOG_URL",
      arg,
      IPC_NONE
    );
    reduxAction(
      dispatcher,
      {
        type: "SET_LOADING",
        arg: false
      },
      "SET_LOADING",
      false,
      IPC_NONE
    );
  });

  ipc.on("set_active_events", function(event: IpcRendererEvent, arg: string) {
    if (!arg) return;
    try {
      const activeEvents = JSON.parse(arg);
      reduxAction(
        dispatcher,
        {
          type: "SET_ACTIVE_EVENTS",
          arg: activeEvents
        },
        "SET_ACTIVE_EVENTS",
        activeEvents,
        IPC_NONE
      );
    } catch (e) {
      console.log("(set_active_events) Error parsing JSON:", arg);
    }
  });
}

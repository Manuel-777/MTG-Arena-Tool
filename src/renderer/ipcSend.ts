import { ipcRenderer as ipc } from "electron";
import { constants, ExploreQuery } from "mtgatool-shared";

const { IPC_BACKGROUND, IPC_RENDERER } = constants;

export function ipcSend(method: "sync_check" | "toggle_edit_mode"): void;

export function ipcSend(
  method:
    | "renderer_window_maximize"
    | "renderer_window_minimize"
    | "renderer_window_close",
  arg: number
): void;

export function ipcSend(method: "toggle_archived", arg: string | number): void;

export function ipcSend(
  method:
    | "import_custom_deck"
    | "set_clipboard"
    | "set_log"
    | "request_cards"
    | "toggle_deck_archived"
    | "request_home",
  arg: string
): void;

export function ipcSend(
  method: "updates_check" | "delete_data",
  arg: boolean
): void;

export function ipcSend(
  method: "force_open_about",
  arg: undefined,
  to: typeof IPC_RENDERER
): void;

export function ipcSend(
  method: "force_open_settings",
  arg: number,
  to: typeof IPC_RENDERER
): void;

export function ipcSend(
  method: "save_user_settings",
  arg: {
    last_open_tab: number;
    settings_section?: number;
  }
): void;

export function ipcSend(
  method: "login",
  arg: {
    username: string;
    password: string;
  }
): void;

export function ipcSend(
  method: "popup",
  arg: {
    text: string;
    time: number;
    progress?: number;
  }
): void;

export function ipcSend(
  method: "export_txt" | "export_csvtxt",
  arg: {
    str: string;
    name: string;
  }
): void;

export function ipcSend(
  method: "request_draft_link",
  arg: {
    expire: number;
    id: string;
    draftData: any;
  }
): void;

export function ipcSend(
  method: "request_log_link",
  arg: {
    expire: number;
    id: string;
    log: any;
  }
): void;

export function ipcSend(
  method: "request_deck_link",
  arg: {
    expire: number;
    deckString: any;
  }
): void;

export function ipcSend(
  method: "save_overlay_settings",
  arg: {
    index: number;
    [P: string]: any;
  }
): void;

export function ipcSend(
  method: "edit_tag",
  arg: {
    tag: string;
    color: string;
  }
): void;

export function ipcSend(method: "request_explore", arg: ExploreQuery): void;

export function ipcSend(
  method: "add_matches_tag" | "delete_matches_tag",
  arg: {
    matchid: string;
    tag: string;
  }
): void;

export function ipcSend(
  method: string,
  arg?: unknown,
  to = IPC_BACKGROUND
): void {
  ipc.send("ipc_switch", method, IPC_RENDERER, arg, to);
}

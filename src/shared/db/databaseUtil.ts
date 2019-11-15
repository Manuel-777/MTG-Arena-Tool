import { app, remote, ipcRenderer as ipc } from "electron";
import {
  CARD_TILE_FLAT,
  DATE_LAST_30,
  OVERLAY_LEFT,
  OVERLAY_FULL,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  IPC_MAIN,
  IPC_BACKGROUND
} from "../constants";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// schema definitions and default values
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// application databases
export const rememberDefaults = {
  email: "",
  token: "",
  settings: {
    toolVersion: 0,
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false,
    metadata_lang: "en",
    log_locale_format: ""
  }
};
export const settingsDefaults = {
  logUri: ""
};

// player database
const overlayDefaults = {
  alpha: 1,
  alpha_back: 1,
  bounds: { width: 300, height: 600, x: 0, y: 0 },
  cards_overlay: true,
  clock: false,
  draw_odds: true,
  deck: true,
  lands: true,
  keyboard_shortcut: true,
  mana_curve: false,
  mode: 1,
  ontop: true,
  show: true,
  show_always: false,
  sideboard: false,
  title: true,
  top: true,
  type_counts: false
};

export const playerDefaults = {
  windowBounds: { width: 800, height: 600, x: 0, y: 0 },
  cards: { cards_time: 0, cards_before: {}, cards: {} },
  cardsNew: {},
  settings: {
    sound_priority: false,
    sound_priority_volume: 1,
    cards_quality: "small",
    startup: true,
    close_to_tray: true,
    send_data: true,
    anon_explore: false,
    close_on_match: true,
    cards_size: 2,
    cards_size_hover_card: 10,
    export_format: "$Name,$Count,$Rarity,$SetName,$Collector",
    back_color: "rgba(0,0,0,0.3)",
    back_url: "",
    right_panel_width: 400,
    last_date_filter: DATE_LAST_30,
    last_open_tab: -1,
    card_tile_style: CARD_TILE_FLAT,
    skip_firstpass: false,
    overlay_scale: 100,
    overlay_ontop: true,
    enable_keyboard_shortcuts: true,
    shortcut_overlay_1: "Alt+Shift+1",
    shortcut_overlay_2: "Alt+Shift+2",
    shortcut_overlay_3: "Alt+Shift+3",
    shortcut_overlay_4: "Alt+Shift+4",
    shortcut_overlay_5: "Alt+Shift+5",
    shortcut_editmode: "Alt+Shift+E",
    shortcut_devtools_main: "Alt+Shift+D",
    shortcut_devtools_overlay: "Alt+Shift+O",
    overlays: [
      {
        ...overlayDefaults,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_LEFT,
        clock: true
      },
      {
        ...overlayDefaults,
        bounds: { width: 300, height: 600, x: 310, y: 0 },
        mode: OVERLAY_SEEN,
        clock: false
      },
      {
        ...overlayDefaults,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_DRAFT,
        clock: false,
        show: false
      },
      {
        ...overlayDefaults,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_LOG,
        clock: false,
        show: false
      },
      {
        ...overlayDefaults,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_FULL,
        show: false
      }
    ]
  },
  seasonal_rank: {},
  seasonal: {},
  economy_index: [],
  economy: {
    gold: 0,
    gems: 0,
    vault: 0,
    wcTrack: 0,
    wcCommon: 0,
    wcUncommon: 0,
    wcRare: 0,
    wcMythic: 0,
    trackName: "",
    trackTier: 0,
    currentLevel: 0,
    currentExp: 0,
    currentOrbCount: 0,
    boosters: []
  },
  rank: {
    constructed: {
      rank: "",
      tier: 0,
      step: 0,
      won: 0,
      lost: 0,
      drawn: 0
    },
    limited: {
      rank: "",
      tier: 0,
      step: 0,
      won: 0,
      lost: 0,
      drawn: 0
    }
  },
  deck_changes: {},
  deck_changes_index: [],
  courses_index: [],
  matches_index: [],
  draft_index: [],
  decks: {},
  decks_tags: {},
  decks_last_used: [],
  static_decks: [],
  static_events: [],
  tags_colors: {}
};

export const USER_DATA_DIR = (app || remote.app).getPath("userData");

// Begin of IPC messages recievers
export function ipcSend(
  method: string,
  from = IPC_BACKGROUND,
  arg: any,
  to = IPC_MAIN
): void {
  ipc.send("ipc_switch", method, from, arg, to);
}

export function logInfo(message: string): void {
  console.log(`Local DB: ${message}`);
}

let blockingQueriesInFlight = 0;

export function showBusy(message: string): void {
  blockingQueriesInFlight += 1;
  logInfo(message);
  ipcSend("popup", IPC_BACKGROUND, { text: message, time: 0, progress: 2 });
}

export function hideBusyIfDone(message?: string): void {
  blockingQueriesInFlight = Math.max(0, blockingQueriesInFlight - 1);
  logInfo(message || "...done.");
  if (blockingQueriesInFlight > 0) {
    return; // not done, still busy
  }
  const time = message ? 3000 : 1;
  ipcSend("popup", IPC_BACKGROUND, { text: message, time, progress: -1 });
}

export function wrapCallback(
  verb: string,
  isBlocking: boolean,
  callback?: (err: Error | null, data: any) => void
): (err: Error | null, data: any) => void {
  return (err: Error | null, data: any): void => {
    let message = "...done.";
    if (err) {
      message = `...ERROR during ${verb}!`;
      console.error("Local DB: ERROR during ${verb}!", err);
    } else {
      if (typeof data === "number" && data > 1) {
      message = `...${verb} complete: ${data} document(s).`;
      } else {
        message = `...${verb} complete.`;
      }
    }
    if (isBlocking) {
      hideBusyIfDone(message);
    }
    if (callback) {
      callback(err, data);
    } else if (err) {
      throw err;
    }
  };
}

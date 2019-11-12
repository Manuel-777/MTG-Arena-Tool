import { app, remote } from "electron";
import {
  CARD_TILE_FLAT,
  DATE_LAST_30,
  OVERLAY_LEFT,
  OVERLAY_FULL,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG
} from "./constants";

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

// manually maintained list of non-document (non-object) fields
// we need this to migrate to nedb since it can only store documents
export const nonDocFields = [
  "email",
  "token",
  "logUri",
  "economy_index",
  "deck_changes_index",
  "courses_index",
  "matches_index",
  "draft_index",
  "decks_last_used",
  "static_decks",
  "static_events"
];

export const USER_DATA_DIR = (app || remote.app).getPath("userData");

export function defaultCallback(
  err: Error | null,
  data: any,
  verb: string
): void {
  if (err) {
    console.error("Local database: ERROR", err);
  } else if (typeof data === "number" && data > 1) {
    console.log(`Local database: ${data} documents ${verb}`);
  } else {
    console.log(`Local database: document ${verb}`);
  }
}

export class DatabaseNotInitializedError extends Error {
  constructor() {
    super("LocalDatabase has not been initialized.");
    this.name = "DatabaseNotInitializedError";
  }
}

export interface LocalDatabase {
  dbName: string;
  filePath: string;
  find(
    table: string,
    key: string,
    callback?: (err: Error | null, data: any) => void
  ): void;
  findAll(callback?: (err: Error | null, data: any) => void): void;
  init(dbName: string, arenaName?: string): void;
  upsert(
    table: string,
    key: string,
    data: any,
    callback?: (err: Error | null, num: number) => void,
    globals?: any
  ): void;
  upsertAll(
    data: any,
    callback?: (err: Error | null, num: number) => void,
    intermediateCallback?: (err: Error | null, num: number) => void
  ): void;
  remove(
    table: string,
    key: string,
    callback?: (err: Error | null, num: number) => void
  ): void;
}

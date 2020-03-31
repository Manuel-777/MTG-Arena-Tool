/* eslint-disable @typescript-eslint/camelcase */
import { remote } from "electron";
import {
  MAIN_HOME,
  DATE_LAST_30,
  ECONOMY_LIST_MODE,
  EVENTS_LIST_MODE,
  DECKS_ART_MODE,
  COLLECTION_CARD_MODE,
  MATCHES_LIST_MODE,
  CARD_TILE_FLAT,
  OVERLAY_LEFT,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_FULL,
  OVERLAY_LOG
} from "./constants";

export const overlayCfg = {
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

const primaryBounds: Electron.Rectangle = remote
  ? remote.screen.getPrimaryDisplay().bounds
  : { width: 800, height: 600, x: 0, y: 0 };

const defaultConfig = {
  windowBounds: { width: 800, height: 600, x: 0, y: 0 },
  cards: { cards_time: 0, cards_before: {}, cards: {} },
  cardsNew: {},
  settings: {
    last_open_tab: MAIN_HOME,
    last_settings_section: 1,
    last_settings_overlay_section: 0,
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
    overlay_back_color: "rgba(0,0,0,0.0)",
    back_url: "",
    right_panel_width: 400,
    last_date_filter: DATE_LAST_30,
    economyTableState: undefined,
    economyTableMode: ECONOMY_LIST_MODE,
    eventsTableState: undefined,
    eventsTableMode: EVENTS_LIST_MODE,
    decksTableState: undefined,
    decksTableMode: DECKS_ART_MODE,
    collectionTableState: undefined,
    collectionTableMode: COLLECTION_CARD_MODE,
    matchesTableState: undefined,
    matchesTableMode: MATCHES_LIST_MODE,
    card_tile_style: CARD_TILE_FLAT,
    skip_firstpass: false,
    overlay_scale: 100,
    overlay_ontop: true,
    overlayHover: { x: 0, y: 0 },
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
        ...overlayCfg,
        bounds: {
          ...primaryBounds,
          width: 300,
          height: 600
        },
        mode: OVERLAY_LEFT,
        clock: true
      },
      {
        ...overlayCfg,
        bounds: {
          ...primaryBounds,
          width: 300,
          height: 600,
          x: primaryBounds.x + 310
        },
        mode: OVERLAY_SEEN,
        clock: false
      },
      {
        ...overlayCfg,
        bounds: { ...primaryBounds, width: 300, height: 600 },
        mode: OVERLAY_DRAFT,
        clock: false,
        show: false
      },
      {
        ...overlayCfg,
        bounds: { ...primaryBounds, width: 300, height: 600 },
        mode: OVERLAY_LOG,
        clock: false,
        show: false
      },
      {
        ...overlayCfg,
        bounds: { ...primaryBounds, width: 300, height: 600 },
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
      drawn: 0,
      percentile: 0,
      leaderboardPlace: 0,
      seasonOrdinal: 0
    },
    limited: {
      rank: "",
      tier: 0,
      step: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      percentile: 0,
      leaderboardPlace: 0,
      seasonOrdinal: 0
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

export default defaultConfig;

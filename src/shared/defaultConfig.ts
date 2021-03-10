/* eslint-disable @typescript-eslint/camelcase */
import { remote } from "electron";
import path from "path";
import { constants } from "mtgatool-shared";
import { SettingsDataApp } from "../types/settings";

const {
  MAIN_HOME,
  DATE_LAST_30,
  ECONOMY_LIST_MODE,
  EVENTS_LIST_MODE,
  DECKS_ART_MODE,
  COLLECTION_CARD_MODE,
  MATCHES_LIST_MODE,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_FULL,
  OVERLAY_LOG,
  OVERLAY_MIXED,
} = constants;

const overlayCfg = {
  alpha: 1,
  alpha_back: 0.7,
  bounds: { width: 300, height: 600, x: 0, y: 0 },
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
  type_counts: false,
  autosize: false,
  collapsed: false,
};

const primaryBounds: Electron.Rectangle = remote
  ? remote.screen.getPrimaryDisplay().bounds
  : { width: 800, height: 600, x: 0, y: 0 };

const defaultThemePath: string = remote
  ? path.join(remote.app.getPath("userData"), "theme.json")
  : "";

const defaultConfig = {
  windowBounds: { width: 900, height: 700, x: 0, y: 0 },
  cards: { cards_time: 0, cards_before: {}, cards: {} },
  cardsNew: {},
  settings: {
    last_open_tab: MAIN_HOME,
    settings_section: 1,
    settings_overlay_section: 0,
    sound_priority: false,
    sound_priority_volume: 1,
    cards_quality: "normal",
    startup: true,
    close_to_tray: true,
    send_data: true,
    anon_explore: false,
    close_on_match: true,
    cards_size: 2,
    cards_size_hover_card: 10,
    export_format: "$Name,$Count,$Rarity,$SetName,$Collector",
    back_color: "rgba(0,0,0,0.3)",
    back_shadow: true,
    overlay_back_color: "#000000ff",
    back_url: "",
    themeUri: defaultThemePath,
    right_panel_width: 300,
    right_panel_width_sub: 300,
    last_date_filter: DATE_LAST_30,
    economyTableState: undefined,
    economyTableMode: ECONOMY_LIST_MODE,
    eventsTableState: undefined,
    eventsTableMode: EVENTS_LIST_MODE,
    decksTableState: undefined,
    decksTableMode: DECKS_ART_MODE,
    collectionTableState: undefined,
    collectionQuery: "f:standard r>token",
    collectionMode: COLLECTION_CARD_MODE,
    matchesTableState: undefined,
    matchesTableMode: MATCHES_LIST_MODE,
    skip_firstpass: false,
    overlay_scale: 100,
    overlay_ontop: true,
    overlay_overview: true,
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
    fullOverlayBounds: [],
    primaryMonitorPos: { x: 0, y: 0 },
    overlays: [
      {
        ...overlayCfg,
        bounds: {
          ...primaryBounds,
          width: 280,
          height: 600,
        },
        mode: OVERLAY_MIXED,
        autosize: true,
        clock: false,
        alpha: 1,
        alpha_back: 0.4,
        lands: true,
      },
      {
        ...overlayCfg,
        bounds: {
          ...primaryBounds,
          width: 280,
          height: 600,
          x: primaryBounds.x + 300,
        },
        mode: OVERLAY_SEEN,
        autosize: true,
        clock: false,
        alpha: 1,
        alpha_back: 0.4,
      },
      {
        ...overlayCfg,
        bounds: { ...primaryBounds, width: 300, height: 600 },
        mode: OVERLAY_DRAFT,
        clock: false,
        show: false,
      },
      {
        ...overlayCfg,
        bounds: { ...primaryBounds, width: 300, height: 600 },
        mode: OVERLAY_LOG,
        clock: false,
        show: false,
      },
      {
        ...overlayCfg,
        bounds: { ...primaryBounds, width: 300, height: 600 },
        mode: OVERLAY_FULL,
        autosize: true,
        show: false,
      },
    ],
  } as SettingsDataApp,
};

export default defaultConfig;

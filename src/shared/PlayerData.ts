/* eslint-disable @typescript-eslint/camelcase */

import { remote } from "electron";
import _ from "lodash";
import { InternalDraft } from "../types/draft";
import { InternalEconomyTransaction } from "../types/inventory";
import { InternalRankUpdate } from "../types/rank";
import {
  CARD_TILE_FLAT,
  COLLECTION_CARD_MODE,
  DATE_LAST_30,
  DECKS_ART_MODE,
  ECONOMY_LIST_MODE,
  EVENTS_LIST_MODE,
  MATCHES_LIST_MODE,
  OVERLAY_DRAFT,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_LOG,
  OVERLAY_SEEN,
  MAIN_HOME
} from "./constants";

const overlayCfg = {
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

export const defaultCfg = {
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

class PlayerData implements Record<string, any> {
  private static instance?: PlayerData = undefined;

  public cards: {
    cards_time: number;
    cards_before: Record<string, number>;
    cards: Record<string, number>;
  } = defaultCfg.cards;
  public cardsNew: Record<string, number> = {};
  public deck_changes: Record<string, any> = {};
  public decks_tags: Record<string, string[]> = {};
  public deck_changes_index: string[] = [];
  public static_events: string[] = [];
  public tags_colors: Record<string, string> = {};
  public economy = defaultCfg.economy;
  public seasonal: Record<string, InternalRankUpdate> = {};
  public seasonal_rank: Record<string, any> = {};
  public economy_index: string[] = [];
  public draft_index: string[] = [];

  public last_log_timestamp = "";
  public last_log_format = "";
  public appDbPath = "";
  public playerDbPath = "";
  public defaultCfg = { ...defaultCfg };

  constructor() {
    if (PlayerData.instance) return PlayerData.instance;

    this.deckChangeExists = this.deckChangeExists.bind(this);
    this.deckChanges = this.deckChanges.bind(this);
    this.draft = this.draft.bind(this);
    this.draftExists = this.draftExists.bind(this);
    this.seasonalExists = this.seasonalExists.bind(this);
    this.transaction = this.transaction.bind(this);
    this.transactionExists = this.transactionExists.bind(this);

    PlayerData.instance = this;
  }

  get transactionList(): InternalEconomyTransaction[] {
    return this.economy_index
      .filter(this.transactionExists)
      .map(this.transaction) as InternalEconomyTransaction[];
  }

  get draftList(): any[] {
    return this.draft_index.filter(this.draftExists).map(this.draft);
  }

  get data(): Record<string, any> {
    const data: Record<string, any> = {};
    const blacklistKeys = [
      "defaultCfg",
      "gems_history",
      "gold_history",
      "overlayCfg",
      "wildcards_history",
      "windowBounds",
      "offline"
    ];
    Object.entries(this).forEach(([key, value]) => {
      if (value instanceof Function) return;
      if (blacklistKeys.includes(key)) return;
      data[key] = value;
    });

    return data;
  }

  transaction(id?: string): InternalEconomyTransaction | undefined {
    if (!id || !this.transactionExists(id)) return undefined;
    const data = this as Record<string, any>;
    const txnData = data[id];
    return {
      ...txnData,
      // Some old data stores the raw original context in ".originalContext"
      // All NEW data stores this in ".context" and ".originalContext" is blank.
      originalContext: txnData.originalContext ?? txnData.context
    };
  }

  transactionExists(id?: string): boolean {
    return !!id && id in this;
  }

  deckChangeExists(id?: string): boolean {
    return !!id && id in this.deck_changes;
  }

  deckChanges(id?: string): any[] {
    //if (!this.deckExists(id)) return [];
    return this.deck_changes_index
      .map(id => this.deck_changes[id])
      .filter(change => change && change.deckId === id);
  }

  draft(id?: string): InternalDraft | undefined {
    if (!id || !this.draftExists(id)) return undefined;
    const data = this as Record<string, any>;
    const draftData = data[id];
    return { ...draftData, type: "draft" };
  }

  draftExists(id?: string): boolean {
    return !!id && this.draft_index.includes(id) && id in this;
  }

  seasonalExists(id?: string): boolean {
    return !!id && id in this.seasonal;
  }

  // I was not sure weter it was correct to include this here or in the
  // utilities file. here its easier to handle the data.
  addSeasonalRank(
    rank: InternalRankUpdate,
    seasonOrdinal: any,
    type = "constructed"
  ): any {
    if (!seasonOrdinal && rank.seasonOrdinal) {
      seasonOrdinal = rank.seasonOrdinal;
    }

    const seasonTag = seasonOrdinal + "_" + type.toLowerCase();
    if (!this.seasonal_rank[seasonTag]) {
      this.seasonal_rank[seasonTag] = [];
    }

    // Check if this entry exists in the season data.
    //console.log("id: " + rank.id, this.seasonalExists(rank.id));
    if (!this.seasonalExists(rank.id)) {
      this.seasonal_rank[seasonTag].push(rank.id);
      this.seasonal[rank.id] = rank;
    }

    // Return tag for references?
    return this.seasonal_rank;
  }
}

const playerData = new PlayerData();

export default playerData;

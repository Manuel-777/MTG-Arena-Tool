/* eslint-disable @typescript-eslint/camelcase */
import isValid from "date-fns/isValid";
import parseISO from "date-fns/parseISO";
import { ipcRenderer as ipc, remote } from "electron";
import _ from "lodash";
import { InternalDeck } from "../types/Deck";
import { InternalEvent } from "../types/event";
import { InternalEconomyTransaction } from "../types/inventory";
import { InternalMatch } from "../types/match";
import { InternalRank, InternalRankUpdate } from "../types/rank";
import {
  BLACK,
  BLUE,
  CARD_TILE_FLAT,
  COLLECTION_CARD_MODE,
  DATE_LAST_30,
  DECKS_ART_MODE,
  DEFAULT_TILE,
  ECONOMY_LIST_MODE,
  EVENTS_LIST_MODE,
  GREEN,
  MATCHES_LIST_MODE,
  OVERLAY_DRAFT,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_LOG,
  OVERLAY_SEEN,
  RED,
  WHITE,
  MAIN_HOME
} from "./constants";
import db from "./database";
import { MergedSettings } from "../types/settings";

export const playerDataDefault = {
  name: "",
  userName: "",
  arenaId: "",
  arenaVersion: "",
  offline: false,
  patreon: false,
  patreon_tier: -1,
  last_log_timestamp: null,
  last_log_format: "",
  appDbPath: "",
  playerDbPath: "",
  settings: {
    email: "",
    token: "",
    toolVersion: 0,
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false,
    metadata_lang: "en",
    log_locale_format: "",
    logUri: ""
  }
};

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

const defaultDeck = JSON.parse(
  '{"deckTileId":' +
    DEFAULT_TILE +
    ',"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}'
);

// Cannot use Deck/ColorList classes because it would cause circular dependency
// tweaked for heavy use in PlayerData/Aggregator
function getDeckColors(deck: InternalDeck): number[] {
  if (deck.colors && deck.colors instanceof Array) {
    // if field exists, assume it was correctly pre-computed by latest code
    return deck.colors;
  }

  const colorSet = new Set<number>();

  deck.mainDeck.forEach((card: { id: number; quantity: number }) => {
    if (card.quantity < 1) {
      return;
    }

    const cardData = db.card(card.id);

    if (!cardData) {
      return;
    }

    const isLand = cardData.type.indexOf("Land") !== -1;
    const frame = cardData.frame;
    if (isLand && frame.length < 3) {
      frame.forEach((colorIndex: number) => colorSet.add(colorIndex));
    }
    // TODO this does not work with multi-color symbols
    cardData.cost.forEach((cost: string) => {
      if (cost === "w") {
        colorSet.add(WHITE);
      } else if (cost === "u") {
        colorSet.add(BLUE);
      } else if (cost === "b") {
        colorSet.add(BLACK);
      } else if (cost === "r") {
        colorSet.add(RED);
      } else if (cost === "g") {
        colorSet.add(GREEN);
      }
    });
  });

  const colorIndices = [...colorSet];
  colorIndices.sort();
  return colorIndices;
}

function prettierDeckData(deckData: InternalDeck): InternalDeck {
  // many precon descriptions are total garbage
  // manually update them with generic descriptions
  const prettyDescriptions: Record<string, string> = {
    "Decks/Precon/Precon_EPP_BG_Desc": "Golgari Swarm",
    "Decks/Precon/Precon_EPP_BR_Desc": "Cult of Rakdos",
    "Decks/Precon/Precon_EPP_GU_Desc": "Simic Combine",
    "Decks/Precon/Precon_EPP_GW_Desc": "Selesnya Conclave",
    "Decks/Precon/Precon_EPP_RG_Desc": "Gruul Clans",
    "Decks/Precon/Precon_EPP_RW_Desc": "Boros Legion",
    "Decks/Precon/Precon_EPP_UB_Desc": "House Dimir",
    "Decks/Precon/Precon_EPP_UR_Desc": "Izzet League",
    "Decks/Precon/Precon_EPP_WB_Desc": "Orzhov Syndicate",
    "Decks/Precon/Precon_EPP_WU_Desc": "Azorius Senate",
    "Decks/Precon/Precon_July_B": "Out for Blood",
    "Decks/Precon/Precon_July_U": "Azure Skies",
    "Decks/Precon/Precon_July_G": "Forest's Might",
    "Decks/Precon/Precon_July_R": "Dome Destruction",
    "Decks/Precon/Precon_July_W": "Angelic Army",
    "Decks/Precon/Precon_Brawl_Alela": "Alela, Artful Provocateur",
    "Decks/Precon/Precon_Brawl_Chulane": "Chulane, Teller of Tales",
    "Decks/Precon/Precon_Brawl_Korvold": "Korvold, Fae-Cursed King",
    "Decks/Precon/Precon_Brawl_SyrGwyn": "Syr Gwyn, Hero of Ashvale"
  };
  if (deckData.description in prettyDescriptions) {
    deckData.description = prettyDescriptions[deckData.description];
  }
  if (deckData.name.includes("?=?Loc")) {
    // precon deck names are garbage address locators
    // mask them with description instead
    deckData.name = deckData.description || "Preconstructed Deck";
  }
  return deckData;
}

class PlayerData implements Record<string, any> {
  private static instance?: PlayerData = undefined;

  public arenaVersion = "";
  public userName = "";
  public cards: {
    cards_time: number;
    cards_before: Record<string, number>;
    cards: Record<string, number>;
  } = defaultCfg.cards;
  public cardsNew: Record<string, number> = {};
  public deck_changes: Record<string, any> = {};
  public static_decks: string[] = [];
  public static_events: string[] = [];
  public tags_colors: Record<string, string> = {};
  public decks: Record<string, InternalDeck> = {};
  public decks_tags: Record<string, string[]> = {};
  public name = "";
  public arenaId = "";
  public rank: InternalRank = defaultCfg.rank;
  public economy = defaultCfg.economy;
  public seasonal: Record<string, InternalRankUpdate> = {};
  public seasonal_rank: Record<string, any> = {};
  public courses_index: string[] = [];
  public deck_changes_index: string[] = [];
  public matches_index: string[] = [];
  public economy_index: string[] = [];
  public draft_index: string[] = [];
  public offline = false;
  public patreon = false;
  public patreon_tier = -1;
  public settings: MergedSettings = {
    ...playerDataDefault.settings,
    ...defaultCfg.settings
  };

  public last_log_timestamp = "";
  public last_log_format = "";
  public appDbPath = "";
  public playerDbPath = "";
  public defaultCfg = { ...defaultCfg };

  constructor() {
    if (PlayerData.instance) return PlayerData.instance;

    this.deck = this.deck.bind(this);
    this.deckChangeExists = this.deckChangeExists.bind(this);
    this.deckChanges = this.deckChanges.bind(this);
    this.deckExists = this.deckExists.bind(this);
    this.draft = this.draft.bind(this);
    this.draftExists = this.draftExists.bind(this);
    this.event = this.event.bind(this);
    this.eventExists = this.eventExists.bind(this);
    this.handleSetData = this.handleSetData.bind(this);
    this.match = this.match.bind(this);
    this.matchExists = this.matchExists.bind(this);
    this.seasonalExists = this.seasonalExists.bind(this);
    this.transaction = this.transaction.bind(this);
    this.transactionExists = this.transactionExists.bind(this);

    if (ipc) ipc.on("set_player_data", this.handleSetData);
    Object.assign(this, {
      ...playerDataDefault,
      ...defaultCfg
    });
    PlayerData.instance = this;
  }

  handleSetData(event: unknown, arg: any): void {
    try {
      arg = JSON.parse(arg);
      Object.assign(this, arg);
    } catch (e) {
      console.log("Unable to parse player data", e);
    }
  }

  get cardsSize(): number {
    return 100 + this.settings.cards_size * 15;
  }

  get cardsSizeHoverCard(): number {
    return 100 + this.settings.cards_size_hover_card * 15;
  }

  get transactionList(): InternalEconomyTransaction[] {
    return this.economy_index
      .filter(this.transactionExists)
      .map(this.transaction) as InternalEconomyTransaction[];
  }

  get deckList(): InternalDeck[] {
    return Object.keys(this.decks).map(this.deck) as InternalDeck[];
  }

  get draftList(): any[] {
    return this.draft_index.filter(this.draftExists).map(this.draft);
  }

  get eventList(): InternalEvent[] {
    return this.courses_index
      .filter(this.eventExists)
      .map(this.event) as InternalEvent[];
  }

  get matchList(): InternalMatch[] {
    return this.matches_index
      .filter(this.matchExists)
      .map(this.match) as InternalMatch[];
  }

  get data(): Record<string, any> {
    const data: Record<string, any> = {};
    const blacklistKeys = [
      ...Object.keys(playerDataDefault),
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

    const settingsBlacklistKeys = [
      "toolVersion",
      "auto_login",
      "launch_to_tray",
      "logUri",
      "log_locale_format",
      "remember_me",
      "beta_channel",
      "metadata_lang",
      "email",
      "token"
    ];
    data.settings = _.omit(this.settings, settingsBlacklistKeys);

    // console.log(data);
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

  deck(id?: string): InternalDeck | undefined {
    if (!id || !this.deckExists(id)) return undefined;
    const preconData = db.preconDecks[id] || {};
    const deckData = {
      ...preconData,
      ...this.decks[id],
      colors: getDeckColors(this.decks[id]),
      custom: !this.static_decks.includes(id),
      tags: this.decks_tags[id] || []
    };
    // lastUpdated does not specify timezone but implicitly occurs at UTC
    // attempt to add UTC timezone to lastUpdated iff result would be valid
    if (
      deckData.lastUpdated &&
      !deckData.lastUpdated.includes("Z") &&
      isValid(parseISO(deckData.lastUpdated + "Z"))
    ) {
      deckData.lastUpdated = deckData.lastUpdated + "Z";
    }
    return prettierDeckData(deckData);
  }

  deckExists(id?: string): boolean {
    return !!id && id in this.decks;
  }

  deckChanges(id?: string): any[] {
    if (!this.deckExists(id)) return [];
    return this.deck_changes_index
      .map(id => this.deck_changes[id])
      .filter(change => change && change.deckId === id);
  }

  draft(id?: string): any {
    if (!id || !this.draftExists(id)) return undefined;
    const data = this as Record<string, any>;
    const draftData = data[id];
    return { ...draftData, type: "draft" };
  }

  draftExists(id?: string): boolean {
    return !!id && this.draft_index.includes(id) && id in this;
  }

  event(id?: string): InternalEvent | undefined {
    if (!id || !this.eventExists(id)) return undefined;
    const data = this as Record<string, any>;
    const eventData = data[id];
    return {
      ...eventData,
      custom: !this.static_events.includes(id),
      type: "Event"
    };
  }

  eventExists(id?: string): boolean {
    return !!id && id in this;
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

  match(id?: string): InternalMatch | undefined {
    if (!id || !this.matchExists(id)) return undefined;
    const data = this as Record<string, any>;
    const matchData = data[id];
    let preconData = {};
    if (matchData.playerDeck && matchData.playerDeck.id in db.preconDecks) {
      preconData = db.preconDecks[matchData.playerDeck.id];
    }
    const playerDeck = prettierDeckData({
      ...defaultDeck,
      ...preconData,
      ...matchData.playerDeck
    });
    playerDeck.colors = getDeckColors(playerDeck);

    const oppDeck = { ...defaultDeck, ...matchData.oppDeck };
    oppDeck.colors = getDeckColors(oppDeck);

    return {
      ...matchData,
      id,
      oppDeck,
      playerDeck,
      type: "match"
    };
  }

  matchExists(id?: string): boolean {
    return !!id && id in this;
  }
}

const playerData = new PlayerData();

export default playerData;

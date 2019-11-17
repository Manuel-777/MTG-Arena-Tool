import electron from "electron";
const ipc = electron.ipcRenderer;
import _ from "lodash";
import {
  CARD_TILE_FLAT,
  DATE_LAST_30,
  DEFAULT_TILE,
  BLACK,
  BLUE,
  GREEN,
  RED,
  WHITE,
  OVERLAY_LEFT,
  OVERLAY_FULL,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG
} from "./constants";
import db from "./database";

const playerDataDefault = {
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
  playerDbPath: ""
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

const defaultCfg = {
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
        ...overlayCfg,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_LEFT,
        clock: true
      },
      {
        ...overlayCfg,
        bounds: { width: 300, height: 600, x: 310, y: 0 },
        mode: OVERLAY_SEEN,
        clock: false
      },
      {
        ...overlayCfg,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_DRAFT,
        clock: false,
        show: false
      },
      {
        ...overlayCfg,
        bounds: { width: 300, height: 600, x: 0, y: 0 },
        mode: OVERLAY_LOG,
        clock: false,
        show: false
      },
      {
        ...overlayCfg,
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

const defaultDeck = JSON.parse(
  '{"deckTileId":' +
    DEFAULT_TILE +
    ',"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}'
);

// Cannot use Deck/ColorList classes because it would cause circular dependency
// tweaked for heavy use in player-data/aggregator
function getDeckColors(deck) {
  if (deck.colors && deck.colors instanceof Array) {
    // if field exists, assume it was correctly pre-computed by latest code
    return deck.colors;
  }

  const colorSet = new Set();

  deck.mainDeck.forEach(card => {
    if (card.quantity < 1) {
      return;
    }

    let cardData = db.card(card.id);

    if (!cardData) {
      return;
    }

    let isLand = cardData.type.indexOf("Land") !== -1;
    let frame = cardData.frame;
    if (isLand && frame.length < 3) {
      frame.forEach(colorIndex => colorSet.add(colorIndex));
    }

    cardData.cost.forEach(cost => {
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

function prettierDeckData(deckData) {
  // many precon descriptions are total garbage
  // manually update them with generic descriptions
  const prettyDescriptions = {
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

class PlayerData {
  constructor() {
    if (PlayerData.instance) return PlayerData.instance;

    this.handleSetData = this.handleSetData.bind(this);
    if (ipc) ipc.on("set_player_data", this.handleSetData);

    this.transaction = this.transaction.bind(this);
    this.deck = this.deck.bind(this);
    this.decks = undefined;
    this.name = undefined;
    this.arenaId = undefined;
    this.rank = undefined;
    this.economy = undefined;
    this.offline = false;
    this.patreon = false;
    this.patreon_tier = -1;
    this.settings = undefined;
    this.draft = this.draft.bind(this);
    this.event = this.event.bind(this);
    this.match = this.match.bind(this);
    this.transactionExists = this.transactionExists.bind(this);
    this.deckExists = this.deckExists.bind(this);
    this.deckChangeExists = this.deckChangeExists.bind(this);
    this.draftExists = this.draftExists.bind(this);
    this.eventExists = this.eventExists.bind(this);
    this.matchExists = this.matchExists.bind(this);
    this.seasonalExists = this.seasonalExists.bind(this);
    this.deckChanges = this.deckChanges.bind(this);

    Object.assign(this, {
      ...playerDataDefault,
      ...defaultCfg,
      defaultCfg: { ...defaultCfg }
    });

    PlayerData.instance = this;
  }

  handleSetData(_event, arg) {
    try {
      arg = JSON.parse(arg);
      Object.assign(this, arg);
    } catch (e) {
      console.log("Unable to parse player data", e);
    }
  }

  get cardsSize() {
    return 100 + this.settings.cards_size * 15;
  }

  get cardsSizeHoverCard() {
    return 100 + this.settings.cards_size_hover_card * 15;
  }

  get transactionList() {
    return this.economy_index
      .filter(this.transactionExists)
      .map(this.transaction);
  }

  get deckList() {
    return Object.keys(this.decks).map(this.deck);
  }

  get draftList() {
    return this.draft_index.filter(this.draftExists).map(this.draft);
  }

  get eventList() {
    return this.courses_index.filter(this.eventExists).map(this.event);
  }

  get matchList() {
    return this.matches_index.filter(this.matchExists).map(this.match);
  }

  get history() {
    return [...this.matchList, ...this.draftList];
  }

  get data() {
    const data = {};
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
    data.settings = _.omit(data.settings, settingsBlacklistKeys);

    // console.log(data);
    return data;
  }

  transaction(id) {
    if (!this.transactionExists(id)) return false;
    return {
      ...this[id],
      // Some old data stores the raw original context in ".originalContext"
      // All NEW data stores this in ".context" and ".originalContext" is blank.
      originalContext: this[id].originalContext || this[id].context
    };
  }

  transactionExists(id) {
    return id in this;
  }

  deckChangeExists(id) {
    return id in this.deck_changes;
  }

  deck(id) {
    if (!this.deckExists(id)) return false;
    const preconData = db.preconDecks[id] || {};
    const deckData = {
      ...preconData,
      ...this.decks[id],
      colors: getDeckColors(this.decks[id]),
      custom: !this.static_decks.includes(id),
      tags: this.decks_tags[id] || []
    };
    return prettierDeckData(deckData);
  }

  deckExists(id) {
    return id in this.decks;
  }

  deckChanges(id) {
    if (!this.deckExists(id)) return [];
    return this.deck_changes_index
      .map(id => this.deck_changes[id])
      .filter(change => change && change.deckId === id);
  }

  draft(id) {
    if (!this.draftExists(id)) return false;
    return { ...this[id], type: "draft" };
  }

  draftExists(id) {
    return this.draft_index.includes(id) && id in this;
  }

  event(id) {
    if (!this.eventExists(id)) return false;
    return {
      ...this[id],
      custom: !this.static_events.includes(id),
      type: "Event"
    };
  }

  eventExists(id) {
    return id in this;
  }

  seasonalExists(id) {
    return id in this.seasonal;
  }

  // I was not sure weter it was correct to include this here or in the
  // utilities file. here its easier to handle the data.
  addSeasonalRank(rank, seasonOrdinal, type = "constructed") {
    if (!seasonOrdinal && rank.seasonOrdinal) {
      seasonOrdinal = rank.seasonOrdinal;
    }

    let seasonTag = seasonOrdinal + "_" + type.toLowerCase();
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

  match(id) {
    if (!this.matchExists(id)) return false;
    const matchData = this[id];
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

  matchExists(id) {
    return id in this;
  }
}

const playerData = new PlayerData();

export default playerData;

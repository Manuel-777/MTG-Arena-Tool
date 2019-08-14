const electron = require("electron");
const ipc = electron.ipcRenderer;
const _ = require("lodash");

const {
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
} = require("../shared/constants");
const db = require("../shared/database");

const playerDataDefault = {
  name: "",
  userName: "",
  arenaId: "",
  arenaVersion: "",
  offline: false,
  patreon: false,
  patreon_tier: 0,
  last_log_timestamp: null,
  last_log_format: ""
};

const overlayCfg = {
  alpha: 1,
  alpha_back: 1,
  bounds: { width: 300, height: 600, x: 0, y: 0 },
  clock: false,
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
    export_format: "$Name,$Count,$Rarity,$SetName,$Collector",
    back_color: "rgba(0,0,0,0.3)",
    back_url: "",
    right_panel_width: 400,
    last_date_filter: DATE_LAST_30,
    last_open_tab: -1,
    card_tile_style: CARD_TILE_FLAT,
    skip_firstpass: false,
    overlay_scale: 100,
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

// cloned from util to avoid circular dependency
// TODO refactor to recombine
function get_deck_colors(deck) {
  var colorIndices = [];
  try {
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
        colorIndices = colorIndices.concat(frame);
      }

      cardData.cost.forEach(cost => {
        if (cost === "w") {
          colorIndices.push(WHITE);
        } else if (cost === "u") {
          colorIndices.push(BLUE);
        } else if (cost === "b") {
          colorIndices.push(BLACK);
        } else if (cost === "r") {
          colorIndices.push(RED);
        } else if (cost === "g") {
          colorIndices.push(GREEN);
        }
      });
    });

    colorIndices = Array.from(new Set(colorIndices));
    colorIndices.sort((a, b) => {
      return a - b;
    });
  } catch (e) {
    // FIXME: Errors shouldn't be caught silently. If this is an
    //        expected error then there should be a test to catch only that error.
    colorIndices = [];
  }

  deck.colors = colorIndices;
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
    "Decks/Precon/Precon_July_B": "Mono Black",
    "Decks/Precon/Precon_July_U": "Mono Blue",
    "Decks/Precon/Precon_July_G": "Mono Green",
    "Decks/Precon/Precon_July_R": "Mono Red",
    "Decks/Precon/Precon_July_W": "Mono White"
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
    this.draft = this.draft.bind(this);
    this.event = this.event.bind(this);
    this.match = this.match.bind(this);
    this.transactionExists = this.transactionExists.bind(this);
    this.deckExists = this.deckExists.bind(this);
    this.deckChangeExists = this.deckChangeExists.bind(this);
    this.draftExists = this.draftExists.bind(this);
    this.eventExists = this.eventExists.bind(this);
    this.matchExists = this.matchExists.bind(this);
    this.deckChanges = this.deckChanges.bind(this);

    Object.assign(this, {
      ...playerDataDefault,
      ...defaultCfg,
      defaultCfg: { ...defaultCfg }
    });

    PlayerData.instance = this;
  }

  handleSetData(_event, arg) {
    Object.assign(this, arg);
  }

  get cardsSize() {
    return 100 + this.settings.cards_size * 10;
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
      "beta_channel"
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
    return this.economy_index.includes(id) && id in this;
  }

  deckChangeExists(id) {
    return this.deck_changes_index.includes(id) && id in this.deck_changes;
  }

  deck(id) {
    if (!this.deckExists(id)) return false;
    const preconData = db.preconDecks[id] || {};
    const deckData = {
      ...preconData,
      ...this.decks[id],
      colors: get_deck_colors(this.decks[id]),
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
    return this.courses_index.includes(id) && id in this;
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
    playerDeck.colors = get_deck_colors(playerDeck);

    const oppDeck = { ...defaultDeck, ...matchData.oppDeck };
    oppDeck.colors = get_deck_colors(oppDeck);

    return {
      ...matchData,
      id,
      oppDeck,
      playerDeck,
      type: "match"
    };
  }

  matchExists(id) {
    return this.matches_index.includes(id) && id in this;
  }
}

module.exports = new PlayerData();

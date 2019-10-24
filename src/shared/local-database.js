import { app, remote } from "electron";
import path from "path";
import Store from "electron-store";
import Datastore from "nedb";

import {
  CARD_TILE_FLAT,
  DATE_LAST_30,
  OVERLAY_LEFT,
  OVERLAY_FULL,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG
} from "../shared/constants";

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
const settingsDefaults = {
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
    cards_size_hover_card: 2,
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
const nonDocFields = [
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

function defaultCallback(err, data, verb) {
  if (err) {
    console.error("Local database: ERROR", err);
  } else if (typeof data === "number" && data > 1) {
    console.log(`Local database: ${data} documents ${verb}`);
  } else {
    console.log(`Local database: document ${verb}`);
  }
}

class ElectronStoreDb {
  constructor() {
    this.init = this.init.bind(this);
    this.getStore = this.getStore.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  // maps table-key to fields on electron-store JSON file
  static getElectronStoreField(table, key) {
    return table ? table + "." + key : key;
  }

  init(dbName) {
    this.dbName = dbName;

    if (dbName === "application") {
      this.rememberStore = new Store({
        name: "remember",
        defaults: rememberDefaults
      });
      this.settingsStore = new Store({
        name: "settings",
        defaults: settingsDefaults
      });
    } else {
      this.playerStore = new Store({
        name: dbName,
        defaults: playerDefaults
      });
    }
  }

  // maps table-key edge cases to special electron-stores
  getStore(key) {
    if (this.dbName === "application") {
      if (key === "logUri") {
        return this.settingsStore;
      }
      return this.rememberStore;
    }
    return this.playerStore;
  }

  // callback: (err, data) => {}
  findAll(callback) {
    callback(null, this.getStore().get());
  }

  // callback: (err, num) => {}
  upsertAll(data, callback) {
    this.getStore().set(data);
    const docCount = Object.keys(data).length;
    if (callback) {
      callback(null, docCount);
    } else {
      defaultCallback(null, docCount, "upserted");
    }
  }

  // callback: (err, num) => {}
  upsert(table, key, data, callback, globals) {
    if (
      globals &&
      !globals.debugLog &&
      globals.firstPass &&
      table !== "application"
    ) {
      // special optimization to handle initial log read
      // skip persisting changes until final bulk upsertAll call
      return;
    }

    const field = ElectronStoreDb.getElectronStoreField(table, key);
    this.getStore(key).set(field, data);
    if (callback) {
      callback(null, 1);
    } else {
      defaultCallback(null, 1, "upserted");
    }
  }

  // callback: (err, doc) => {}
  find(table, key, callback) {
    const field = ElectronStoreDb.getElectronStoreField(table, key);
    callback(null, this.getStore(key).get(field));
  }

  // callback: (err, num) => {}
  remove(table, key, callback) {
    // Note: we must always run delete, regardless of firstpass
    const field = ElectronStoreDb.getElectronStoreField(table, key);
    this.getStore(key).delete(field);
    if (callback) {
      callback(null, 1);
    } else {
      defaultCallback(null, 1, "removed");
    }
  }
}

class NeDb {
  constructor(useBulkFirstpass) {
    this.init = this.init.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
    // whether or not to imitate old electron-store bulk-write
    // behavior during the first pass of the log (deprecated workaround)
    this.useBulkFirstpass = useBulkFirstpass;
  }

  static getCleanDoc(doc) {
    if (doc && doc._id) {
      const clean = { ...doc };
      delete clean._id;
      return clean;
    }
    return doc;
  }

  get datastore() {
    return this.dbName === "application" ? this.appStore : this.playerStore;
  }

  init(dbName, arenaName) {
    const userDir = (app || remote.app).getPath("userData");
    this.dbName = arenaName ? arenaName : dbName;

    if (dbName === "application") {
      this.appStore = new Datastore({
        filename: path.join(userDir, "application.db"),
        autoload: true
      });
    } else {
      this.playerStore = new Datastore({
        filename: path.join(userDir, this.dbName + ".db"),
        autoload: true
      });
    }
  }

  // callback: (err, data) => {}
  findAll(callback) {
    this.datastore.find({}, (err, docs) => {
      if (err) {
        callback(err);
        return;
      }
      const data = {};
      docs.forEach(doc => {
        const key = doc._id;
        if (nonDocFields.includes(key)) {
          data[key] = doc.data;
        } else {
          data[key] = NeDb.getCleanDoc(doc);
        }
      });
      callback(null, data);
    });
  }

  // callback: (err, num) => {}
  upsertAll(data, callback) {
    // TODO figure out a way to implement callback or remove entirely
    if (this.useBulkFirstpass) {
      Object.entries(data).forEach(([key, value]) => {
        this.upsert("", key, value);
      });
    }
  }

  // callback: (err, num) => {}
  upsert(table, key, data, callback, globals) {
    if (
      this.useBulkFirstpass &&
      globals &&
      !globals.debugLog &&
      globals.firstPass &&
      table !== "application"
    ) {
      // special optimization to handle initial log read
      // skip persisting changes until final bulk upsertAll call
      return;
    }

    if (table) {
      // handle updating sub-document
      this.datastore.update(
        { _id: table },
        { $set: { [key]: data } },
        { upsert: true },
        callback
      );
    } else {
      let doc = data;
      if (nonDocFields.includes(key)) {
        // non-document data must be wrapped in an object first
        doc = { data };
      }
      // upsert entire document
      this.datastore.update(
        { _id: key },
        { ...doc, _id: key },
        { upsert: true },
        callback
      );
    }
  }

  // callback: (err, doc) => {}
  find(table, key, callback) {
    let _id = key;
    let subKey = "";
    if (table) {
      _id = table;
      subKey = key;
    } else if (nonDocFields.includes(key)) {
      subKey = "data";
    }
    this.datastore.findOne({ _id }, (err, doc) => {
      if (err) {
        callback(err);
      } else if (subKey && doc && doc[subKey]) {
        callback(null, doc[subKey]);
      } else {
        callback(null, NeDb.getCleanDoc(doc));
      }
    });
  }

  // callback: (err, num) => {}
  remove(table, key, callback) {
    // Note: we must always run delete, regardless of firstpass
    if (table) {
      // handle deleting sub-document
      this.datastore.update(
        { _id: table },
        { $unset: { [key]: true } },
        { upsert: true },
        callback
      );
    } else {
      // remove entire document
      this.datastore.remove({ _id: key }, {}, callback);
    }
  }
}

class MigrationDb {
  constructor() {
    this.init = this.init.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  init(dbName, arenaName) {
    this.oldDb = new ElectronStoreDb();
    this.oldDb.init(dbName);
    this.newDb = new NeDb(true);
    this.newDb.init(dbName, arenaName);
  }

  // callback: (err, data) => {}
  findAll(callback) {
    this.oldDb.findAll(callback);
  }

  // callback: (err, num) => {}
  upsertAll(data, callback) {
    this.oldDb.upsertAll(data, callback);
    this.newDb.upsertAll(data);
  }

  // callback: (err, num) => {}
  upsert(table, key, data, callback, globals) {
    this.oldDb.upsert(table, key, data, callback, globals);
    this.newDb.upsert(table, key, data, null, globals);
  }

  // callback: (err, doc) => {}
  find(table, key, callback) {
    this.oldDb.find(table, key, callback);
  }

  // callback: (err, num) => {}
  remove(table, key, callback) {
    this.oldDb.remove(table, key, callback);
    this.newDb.remove(table, key, null);
  }
}

// Uncomment this to test "pure" refactor
//
// export const appDb = new ElectronStoreDb();
// export const playerDb = new ElectronStoreDb();

// Uncomment this to migrate to NeDb
// (should still behave as before, but copies over data)
//
export const appDb = new MigrationDb();
export const playerDb = new MigrationDb();

// After migration, uncomment this to experience the new hotness
//
// export const appDb = new NeDb();
// export const playerDb = new NeDb();

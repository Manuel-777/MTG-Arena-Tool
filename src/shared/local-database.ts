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

const USER_DATA_DIR = (app || remote.app).getPath("userData");

function defaultCallback(err: Error | null, data: any, verb: string): void {
  if (err) {
    console.error("Local database: ERROR", err);
  } else if (typeof data === "number" && data > 1) {
    console.log(`Local database: ${data} documents ${verb}`);
  } else {
    console.log(`Local database: document ${verb}`);
  }
}

class DatabaseNotInitializedError extends Error {
  constructor() {
    super("LocalDatabase has not been initialized.");
    this.name = "DatabaseNotInitializedError";
  }
}

export interface LocalDb {
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

class ElectronStoreDb implements LocalDb {
  dbName: string;
  rememberStore?: Store<any>;
  settingsStore?: Store<any>;
  playerStore?: Store<any>;

  constructor() {
    this.dbName = "";
    this.init = this.init.bind(this);
    this.getStore = this.getStore.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  get filePath(): string {
    // not bothering to return "settings" store as well
    const fileName = this.dbName === "application" ? "remember" : this.dbName;
    return path.join(USER_DATA_DIR, fileName + ".json" || "");
  }

  // maps table-key to fields on electron-store JSON file
  static getElectronStoreField(table: string, key: string): string {
    return table ? table + "." + key : key;
  }

  init(dbName: string): void {
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
  getStore(key?: string): Store<any> | undefined {
    if (this.dbName === "application") {
      if (key === "logUri") {
        return this.settingsStore;
      }
      return this.rememberStore;
    }
    return this.playerStore;
  }

  findAll(callback: (err: Error | null, data: any) => void) {
    const store = this.getStore();
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    callback(null, store.store);
  }

  upsertAll(data: any, callback: (err: Error | null, num: number) => void) {
    const store = this.getStore();
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    const docCount = Object.keys(data).length;
    if (store) {
      store.set(data);
    }
    if (callback) {
      callback(null, docCount);
    } else {
      defaultCallback(null, docCount, "upserted");
    }
  }

  upsert(
    table: string,
    key: string,
    data: any,
    callback: (err: Error | null, num: number) => void,
    globals?: any
  ) {
    const store = this.getStore(key);
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
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
    store.set(field, data);
    if (callback) {
      callback(null, 1);
    } else {
      defaultCallback(null, 1, "upserted");
    }
  }

  find(
    table: string,
    key: string,
    callback: (err: Error | null, data: any) => void
  ) {
    const store = this.getStore(key);
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    const field = ElectronStoreDb.getElectronStoreField(table, key);
    callback(null, store.get(field));
  }

  remove(
    table: string,
    key: string,
    callback: (err: Error | null, num: number) => void
  ) {
    const store = this.getStore(key);
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    // Note: we must always run delete, regardless of firstpass
    const field = ElectronStoreDb.getElectronStoreField(table, key);
    store.delete(field);
    if (callback) {
      callback(null, 1);
    } else {
      defaultCallback(null, 1, "removed");
    }
  }
}

class NeDb implements LocalDb {
  dbName: string;
  useBulkFirstpass: boolean;
  appStore?: Datastore;
  playerStore?: Datastore;

  constructor(useBulkFirstpass?: boolean) {
    this.dbName = "";
    // whether or not to imitate old electron-store bulk-write
    // behavior during the first pass of the log (deprecated workaround)
    this.useBulkFirstpass = useBulkFirstpass || false;

    this.init = this.init.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  get filePath() {
    return path.join(USER_DATA_DIR, this.dbName + ".db");
  }

  static getCleanDoc(doc: any) {
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

  init(dbName: string, arenaName: string) {
    const userDir = (app || remote.app).getPath("userData");
    this.dbName = arenaName ? arenaName : dbName;

    if (dbName === "application") {
      this.appStore = new Datastore({
        filename: path.join(userDir, "application.db"),
        autoload: true
      });
      // auto-compact once per minute
      this.appStore.persistence.setAutocompactionInterval(60000);
    } else {
      this.playerStore = new Datastore({
        filename: path.join(userDir, this.dbName + ".db"),
        autoload: true
      });
      // auto-compact once per minute
      this.playerStore.persistence.setAutocompactionInterval(60000);
    }
  }

  findAll(callback: (err: Error | null, data: any) => void) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    this.datastore.find({}, (err: Error, docs: any[]) => {
      if (err) {
        callback(err, null);
        return;
      }
      const data: { [key: string]: any } = {};
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

  upsertAll(
    data: any,
    callback: (err: Error | null, num: number) => void,
    intermediateCallback: (err: Error | null, num: number) => void
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    const allData = Object.entries(data);
    allData.reverse();
    const recursiveHelper = (
      dataToUpsert: any[],
      total: number,
      upsert: Function
    ) => {
      if (dataToUpsert.length) {
        const [key, value] = dataToUpsert.pop();
        upsert("", key, value, (err: Error, num: number) => {
          if (num) {
            total += num;
          } else if (err) {
            console.log(err);
          }
          if (intermediateCallback) {
            intermediateCallback(err, total);
          }
          recursiveHelper(dataToUpsert, total, upsert);
        });
      } else {
        callback(null, total);
      }
    };
    recursiveHelper(allData, 0, this.upsert);
  }

  upsert(
    table: string,
    key: string,
    data: any,
    callback: (err: Error | null, num: number) => void,
    globals: any
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
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

  find(
    table: string,
    key: string,
    callback: (err: Error | null, data: any) => void
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
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
        callback(err, null);
      } else if (subKey && doc && doc[subKey]) {
        callback(null, doc[subKey]);
      } else {
        callback(null, NeDb.getCleanDoc(doc));
      }
    });
  }

  remove(
    table: string,
    key: string,
    callback: (err: Error | null, num: number) => void
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
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

class MigrationDb implements LocalDb {
  oldDb?: LocalDb;
  newDb?: LocalDb;

  constructor() {
    this.init = this.init.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  get dbName() {
    return this.oldDb ? this.oldDb.dbName : "";
  }

  get filePath() {
    return this.oldDb ? this.oldDb.filePath : "";
  }

  init(dbName: string, arenaName: string) {
    this.oldDb = new ElectronStoreDb();
    this.oldDb.init(dbName);
    this.newDb = new NeDb(true);
    this.newDb.init(dbName, arenaName);
  }

  findAll(callback: (err: Error | null, data: any) => void) {
    if (!this.oldDb || !this.newDb) {
      throw new DatabaseNotInitializedError();
    }
    this.oldDb.findAll(callback);
  }

  upsertAll(
    data: any,
    callback: (err: Error | null, num: number) => void,
    intermediateCallback: (err: Error | null, num: number) => void
  ) {
    if (!this.oldDb || !this.newDb) {
      throw new DatabaseNotInitializedError();
    }
    this.oldDb.upsertAll(data, callback, intermediateCallback);
    this.newDb.upsertAll(data);
  }

  upsert(
    table: string,
    key: string,
    data: any,
    callback: (err: Error | null, num: number) => void,
    globals: any
  ) {
    if (!this.oldDb || !this.newDb) {
      throw new DatabaseNotInitializedError();
    }
    this.oldDb.upsert(table, key, data, callback, globals);
    this.newDb.upsert(table, key, data, undefined, globals);
  }

  find(
    table: string,
    key: string,
    callback: (err: Error | null, data: any) => void
  ) {
    if (!this.oldDb || !this.newDb) {
      throw new DatabaseNotInitializedError();
    }
    this.oldDb.find(table, key, callback);
  }

  remove(
    table: string,
    key: string,
    callback: (err: Error | null, num: number) => void
  ) {
    if (!this.oldDb || !this.newDb) {
      throw new DatabaseNotInitializedError();
    }
    this.oldDb.remove(table, key, callback);
    this.newDb.remove(table, key);
  }
}

// "pure" refactor
// only necessary for loadPlayerConfig migration logic
export const appDbLegacy: LocalDb = new ElectronStoreDb();
export const playerDbLegacy: LocalDb = new ElectronStoreDb();

export const appDb: LocalDb = new MigrationDb(); // TODO should eventually be NeDb
export const playerDb: LocalDb = new NeDb();

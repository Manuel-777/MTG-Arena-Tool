import path from "path";
import Store from "electron-store";
import {
  USER_DATA_DIR,
  rememberDefaults,
  settingsDefaults,
  showBusy,
  hideBusyIfDone
} from "./databaseUtil";
import { LocalDatabase, DatabaseNotInitializedError } from "./LocalDatabase";

/**
 * This style of database uses electron-store:
 *   https://github.com/sindresorhus/electron-store
 * It was our original persistence tier and better suited for synchronous
 * writes of smaller amounts of data. This class simply wraps it to provide
 * a standard MongoDb-like API and use hacky logic to combine together
 * settings.json and remember.json
 */
export class ElectronStoreDatabase implements LocalDatabase {
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
      const playerData = require("../player-data") as any;
      this.playerStore = new Store({
        name: dbName,
        defaults: playerData.defaultCfg
      });
    }
  }

  // maps table-key edge cases to special electron-stores
  getStore(key?: string) {
    if (this.dbName === "application") {
      if (key === "logUri") {
        return this.settingsStore;
      }
      return this.rememberStore;
    }
    return this.playerStore;
  }

  async findAll() {
    const store = this.getStore();
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Loading all data...");
    const data = store.store;
    const docCount = Object.keys(data).length;
    hideBusyIfDone(`Loading all data... ${docCount} documents loaded.`);
    return data;
  }

  async upsertAll(data: any) {
    const store = this.getStore();
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Saving all data...");
    const docCount = Object.keys(data).length;
    store.set(data);
    hideBusyIfDone(`Saving all data... ${docCount} documents saved.`);
    return docCount;
  }

  async upsert(table: string, key: string, data: any) {
    const store = this.getStore(key);
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    const field = ElectronStoreDatabase.getElectronStoreField(table, key);
    store.set(field, data);
    return 1;
  }

  async find(table: string, key: string) {
    const store = this.getStore(key);
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Loading data...");
    const field = ElectronStoreDatabase.getElectronStoreField(table, key);
    const data = store.get(field);
    hideBusyIfDone("Loading data... complete.");
    return data;
  }

  async remove(table: string, key: string) {
    const store = this.getStore(key);
    if (!store) {
      throw new DatabaseNotInitializedError();
    }
    const field = ElectronStoreDatabase.getElectronStoreField(table, key);
    store.delete(field);
    return 1;
  }
}

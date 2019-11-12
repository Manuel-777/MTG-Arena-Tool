import path from "path";
import Store from "electron-store";
import {
  LocalDatabase,
  USER_DATA_DIR,
  rememberDefaults,
  settingsDefaults,
  playerDefaults,
  DatabaseNotInitializedError,
  defaultCallback
} from "./databaseUtil";

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
    const field = ElectronStoreDatabase.getElectronStoreField(table, key);
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
    const field = ElectronStoreDatabase.getElectronStoreField(table, key);
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
    const field = ElectronStoreDatabase.getElectronStoreField(table, key);
    store.delete(field);
    if (callback) {
      callback(null, 1);
    } else {
      defaultCallback(null, 1, "removed");
    }
  }
}

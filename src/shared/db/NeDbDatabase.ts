import path from "path";
import Datastore from "nedb";
import util from "util";
import { USER_DATA_DIR, showBusy, hideBusyIfDone } from "./databaseUtil";
import sanitize from "sanitize-filename";
import debugLog from "../debugLog";
import {copyFileSync} from "fs";

class DatabaseNotInitializedError extends Error {
  constructor() {
    super("LocalDatabase has not been initialized.");
    this.name = "DatabaseNotInitializedError";
  }
}

// manually maintained list of non-document (non-object) fields
// we need this to migrate to nedb since it can only store documents
const nonDocFields = [
  "economy_index",
  "deck_changes_index",
  "courses_index",
  "matches_index",
  "draft_index",
  "draftv2_index",
  "decks_last_used",
  "static_decks",
  "static_events",
  "private_decks",
];

/**
 * This style of database uses nedb:
 *   https://github.com/louischatriot/nedb
 * This class gives it a thin wrapper that also allows us to:
 *   - use async/await like civilized folks
 *   - call upsertAll
 *   - use hacky logic to wrap "bare" values in proper documents
 *   - sanitize certain MongoDb fields (only _id so far)
 */
export class NeDbDatabase {
  dbName: string;
  datastore?: Datastore;
  // async wrappers of datastore methods
  private _find: any;
  private _update: any;
  private _findOne: any;
  private _remove: any;

  constructor() {
    this.dbName = "";
    this.init = this.init.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  get filePath(): string {
    return path.join(USER_DATA_DIR, this.dbName + ".db");
  }

  static getCleanDoc(doc: any): any {
    if (doc && doc._id) {
      const clean = { ...doc };
      delete clean._id;
      return clean;
    }
    return doc;
  }

  init(dbName: string, arenaName?: string): void {
    this.dbName = sanitize(arenaName ? arenaName : dbName);
    const dbPath = path.join(USER_DATA_DIR, this.dbName + ".db");
    const backupPath = path.join(USER_DATA_DIR, this.dbName + "_backup.db");

    debugLog("Db path: " + dbPath);
    this.datastore = new Datastore({
      filename: dbPath,
    });
    // ensure session begins with most compact possible db
    this.datastore.persistence.compactDatafile();
    this.datastore.loadDatabase((err => {
      if(err !== null) {
        debugLog(err);
        return;
      }
      debugLog("Db backup: " + backupPath);
      copyFileSync(dbPath, backupPath)
    }));

    // async wrappers of datastore methods
    // https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original
    this._find = util.promisify(
      (query: any, cb: any) => this.datastore && this.datastore.find(query, cb)
    );
    this._update = util.promisify(
      (a: any, b: any, c: any, cb: any) =>
        this.datastore && this.datastore.update(a, b, c, cb)
    );
    this._findOne = util.promisify(
      (query: any, cb: any) =>
        this.datastore && this.datastore.findOne(query, cb)
    );
    this._remove = util.promisify(
      (query: any, cb: any) =>
        this.datastore && this.datastore.remove(query, cb)
    );
    // auto-compact once per minute
    this.datastore.persistence.setAutocompactionInterval(60000);
  }

  async findAll(): Promise<{ [key: string]: any }> {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Loading all data...");
    const data: { [key: string]: any } = {};
    const docs: any[] = await this._find({});
    docs.forEach((doc) => {
      const key = doc._id;
      if (nonDocFields.includes(key)) {
        data[key] = doc.data;
      } else {
        data[key] = NeDbDatabase.getCleanDoc(doc);
      }
    });
    const docCount = Object.keys(data).length;
    hideBusyIfDone(`Loading all data... ${docCount} documents loaded.`);
    return data;
  }

  async upsertAll(
    data: any,
    intermediateCallback?: (err: Error | null, num: number) => void
  ): Promise<number> {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Saving all data...");
    const allData = Object.entries(data);
    allData.reverse();
    let successCount = 0;
    for (const [key, value] of allData) {
      try {
        successCount += await this.upsert("", key, value);
        if (intermediateCallback) {
          intermediateCallback(null, successCount);
        }
      } catch (err) {
        debugLog(`Local DB: ERROR during Saving all data!; ${err}`);
        if (intermediateCallback) {
          intermediateCallback(err, successCount);
        }
      }
    }
    hideBusyIfDone(`Saving all data... ${successCount} documents saved.`);
    return successCount;
  }

  async upsert(table: string, key: string, data: any): Promise<number> {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    if (table) {
      // handle updating sub-document
      return await this._update(
        { _id: table },
        { $set: { [key]: data } },
        { upsert: true }
      );
    }
    let doc = data;
    if (nonDocFields.includes(key)) {
      // non-document data must be wrapped in an object first
      doc = { data };
    }
    // upsert entire document
    return await this._update(
      { _id: key },
      { ...doc, _id: key },
      { upsert: true }
    );
  }

  async find(table: string, key: string): Promise<any> {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Loading data...");
    let _id = key;
    let subKey = "";
    if (table) {
      _id = table;
      subKey = key;
    } else if (nonDocFields.includes(key)) {
      subKey = "data";
    }
    const doc = await this._findOne({ _id });
    hideBusyIfDone("Loading data... complete.");
    if (subKey && doc && doc[subKey]) {
      return doc[subKey];
    }
    return NeDbDatabase.getCleanDoc(doc);
  }

  async remove(table: string, key: string): Promise<any> {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    if (table) {
      // handle deleting sub-document
      return await this._update(
        { _id: table },
        { $unset: { [key]: true } },
        { upsert: true }
      );
    }
    // remove entire document
    return await this._remove({ _id: key });
  }
}

import { app, remote } from "electron";
import path from "path";
import Datastore from "nedb";
import { USER_DATA_DIR } from "./databaseUtil";
import { LocalDatabase, DatabaseNotInitializedError } from "./LocalDatabase";

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

/**
 * This style of database uses nedb:
 *   https://github.com/louischatriot/nedb
 * This class gives it a thin wrapper that also allows us to:
 *   - call upsertAll (horrid recursive nested upsert)
 *   - use hacky logic to wrap "bare" values in proper documents
 *   - use hacky logic to combine together settings.json and remember.json
 *   - sanitize certain MongoDb fields (only _id so far)
 */
export class NeDbDatabase implements LocalDatabase {
  dbName: string;
  useBulkFirstpass: boolean;
  appStore?: Datastore;
  playerStore?: Datastore;

  constructor(useBulkFirstpass = false) {
    this.dbName = "";
    // whether or not to imitate old electron-store bulk-write
    // behavior during the first pass of the log (deprecated workaround)
    this.useBulkFirstpass = useBulkFirstpass;
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
      const data: {
        [key: string]: any;
      } = {};
      docs.forEach(doc => {
        const key = doc._id;
        if (nonDocFields.includes(key)) {
          data[key] = doc.data;
        } else {
          data[key] = NeDbDatabase.getCleanDoc(doc);
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
        callback(null, NeDbDatabase.getCleanDoc(doc));
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

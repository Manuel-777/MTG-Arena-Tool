import path from "path";
import Datastore from "nedb";
import { USER_DATA_DIR, showBusy, wrapCallback, logInfo } from "./databaseUtil";
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
 *   - sanitize certain MongoDb fields (only _id so far)
 */
export class NeDbDatabase implements LocalDatabase {
  dbName: string;
  datastore?: Datastore;

  constructor(useBulkFirstpass = false) {
    this.dbName = "";
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

  init(dbName: string, arenaName?: string) {
    this.dbName = arenaName ? arenaName : dbName;
    this.datastore = new Datastore({
      filename: path.join(USER_DATA_DIR, this.dbName + ".db"),
      autoload: true
    });
    // auto-compact once per minute
    this.datastore.persistence.setAutocompactionInterval(60000);
  }

  findAll(callback: (err: Error | null, data: any) => void) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Loading all data...");
    const wrappedCallback = wrapCallback("Loading all data", true, callback);
    this.datastore.find({}, (err: Error, docs: any[]) => {
      const data: {
        [key: string]: any;
      } = {};
      if (docs) {
        docs.forEach(doc => {
          const key = doc._id;
          if (nonDocFields.includes(key)) {
            data[key] = doc.data;
          } else {
            data[key] = NeDbDatabase.getCleanDoc(doc);
          }
        });
      }
      wrappedCallback(err, err ? null : data);
    });
  }

  upsertAll(
    data: any,
    callback?: (err: Error | null, num: number) => void,
    intermediateCallback?: (err: Error | null, num: number) => void
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    showBusy("Saving all data...");
    const wrappedCallback = wrapCallback("Saving all data", true, callback);
    const allData = Object.entries(data);
    allData.reverse();
    const recursiveHelper = (
      dataToUpsert: any[],
      errorCount: number,
      successCount: number,
      upsert: Function
    ) => {
      if (dataToUpsert.length) {
        const [key, value] = dataToUpsert.pop();
        upsert("", key, value, (err: Error, num: number) => {
          if (num) {
            successCount += num;
          } else if (err) {
            errorCount += 1;
            console.error("Local DB: ERROR ${errorCount} during Saving all data!", err);
          }
          if (intermediateCallback) {
            intermediateCallback(err, successCount);
          }
          recursiveHelper(dataToUpsert, errorCount, successCount, upsert);
        });
      } else {
        if (this.datastore) {
          this.datastore.persistence.compactDatafile();
        }
        wrappedCallback(null, successCount);
      }
    };
    recursiveHelper(allData, 0, 0, this.upsert);
  }

  upsert(
    table: string,
    key: string,
    data: any,
    callback?: (err: Error | null, num: number) => void
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    logInfo("Saving data...")
    const wrappedCallback = wrapCallback("Saving data", false, callback);
    if (table) {
      // handle updating sub-document
      this.datastore.update(
        { _id: table },
        { $set: { [key]: data } },
        { upsert: true },
        wrappedCallback
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
        wrappedCallback
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
    showBusy("Loading data...");
    const wrappedCallback = wrapCallback("Loading data", true, callback);
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
        wrappedCallback(err, 0);
      } else if (subKey && doc && doc[subKey]) {
        wrappedCallback(null, doc[subKey]);
      } else {
        wrappedCallback(null, NeDbDatabase.getCleanDoc(doc));
      }
    });
  }

  remove(
    table: string,
    key: string,
    callback?: (err: Error | null, num: number) => void
  ) {
    if (!this.datastore) {
      throw new DatabaseNotInitializedError();
    }
    logInfo("Deleting data...")
    const wrappedCallback = wrapCallback("Deleting data", false, callback);
    // Note: we must always run delete, regardless of firstpass
    if (table) {
      // handle deleting sub-document
      this.datastore.update(
        { _id: table },
        { $unset: { [key]: true } },
        { upsert: true },
        wrappedCallback
      );
    } else {
      // remove entire document
      this.datastore.remove({ _id: key }, {}, wrappedCallback);
    }
  }
}

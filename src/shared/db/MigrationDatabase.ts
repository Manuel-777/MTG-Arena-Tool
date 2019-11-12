import { ElectronStoreDatabase } from "./ElectronStoreDatabase";
import { NeDbDatabase } from "./NeDbDatabase";
import { LocalDatabase, DatabaseNotInitializedError } from "./LocalDatabase";

/**
 * This style of database helps provide a smooth transition between 2 different
 * LocalDatabases by running them simultaneously. The oldDb is the "golden"
 * data source used for all reads. All writes go to both databases. Since this
 * class does not attempt to bulk synchronize by itself, it is mostly a tool
 * for keeping all future changes synchronized during the transition.
 */
export class MigrationDatabase implements LocalDatabase {
  oldDb?: LocalDatabase;
  newDb?: LocalDatabase;

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
    this.oldDb = new ElectronStoreDatabase();
    this.oldDb.init(dbName);
    this.newDb = new NeDbDatabase(true);
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

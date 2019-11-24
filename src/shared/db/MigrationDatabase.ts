import { LocalDatabase } from "./LocalDatabase";

/**
 * This style of database helps provide a smooth transition between 2 different
 * LocalDatabases by running them simultaneously. The oldDb is the "golden"
 * data source used for all reads. All writes go to both databases. Since this
 * class does not attempt to bulk synchronize by itself, it is mostly a tool
 * for keeping all future changes synchronized during the transition.
 */
export class MigrationDatabase implements LocalDatabase {
  oldDb: LocalDatabase;
  newDb: LocalDatabase;

  constructor(oldDb: LocalDatabase, newDb: LocalDatabase) {
    this.oldDb = oldDb;
    this.newDb = newDb;
    this.init = this.init.bind(this);
    this.findAll = this.findAll.bind(this);
    this.upsertAll = this.upsertAll.bind(this);
    this.upsert = this.upsert.bind(this);
    this.find = this.find.bind(this);
    this.remove = this.remove.bind(this);
  }

  get dbName() {
    return this.oldDb.dbName;
  }

  get filePath() {
    return this.oldDb.filePath;
  }

  init(dbName: string, arenaName: string) {
    this.oldDb.init(dbName, arenaName);
    this.newDb.init(dbName, arenaName);
  }

  findAll(callback: (err: Error | null, data: any) => void) {
    this.oldDb.findAll(callback);
  }

  upsertAll(
    data: any,
    callback?: (err: Error | null, num: number) => void,
    intermediateCallback?: (err: Error | null, num: number) => void
  ) {
    this.oldDb.upsertAll(data, callback, intermediateCallback);
    this.newDb.upsertAll(data, undefined, intermediateCallback);
  }

  upsert(
    table: string,
    key: string,
    data: any,
    callback?: (err: Error | null, num: number) => void
  ) {
    this.oldDb.upsert(table, key, data, callback);
    this.newDb.upsert(table, key, data, undefined);
  }

  find(
    table: string,
    key: string,
    callback: (err: Error | null, data: any) => void
  ) {
    this.oldDb.find(table, key, callback);
  }

  remove(
    table: string,
    key: string,
    callback?: (err: Error | null, num: number) => void
  ) {
    this.oldDb.remove(table, key, callback);
    this.newDb.remove(table, key);
  }
}

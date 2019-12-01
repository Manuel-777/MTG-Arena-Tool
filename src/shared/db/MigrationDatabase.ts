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

  async findAll() {
    return await this.oldDb.findAll();
  }

  async upsertAll(
    data: any,
    intermediateCallback?: (err: Error | null, num: number) => void
  ) {
    let num = 0;
    const [oldNum, newNum] = await Promise.all([
      this.oldDb.upsertAll(data, intermediateCallback),
      this.newDb.upsertAll(data, intermediateCallback)
    ]);
    if (oldNum) num += oldNum;
    if (newNum) num += newNum;
    return num;
  }

  async upsert(table: string, key: string, data: any) {
    let num = 0;
    const [oldNum, newNum] = await Promise.all([
      this.oldDb.upsert(table, key, data),
      this.newDb.upsert(table, key, data)
    ]);
    if (oldNum) num += oldNum;
    if (newNum) num += newNum;
    return num;
  }

  async find(table: string, key: string) {
    return await this.oldDb.find(table, key);
  }

  async remove(table: string, key: string) {
    let num = 0;
    const [oldNum, newNum] = await Promise.all([
      this.oldDb.remove(table, key),
      this.newDb.remove(table, key)
    ]);
    if (oldNum) num += oldNum;
    if (newNum) num += newNum;
    return num;
  }
}

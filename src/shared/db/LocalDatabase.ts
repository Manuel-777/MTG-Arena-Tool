import { ElectronStoreDatabase } from "./ElectronStoreDatabase";
import { NeDbDatabase } from "./NeDbDatabase";
import { MigrationDatabase } from "./MigrationDatabase";

export class DatabaseNotInitializedError extends Error {
  constructor() {
    super("LocalDatabase has not been initialized.");
    this.name = "DatabaseNotInitializedError";
  }
}

export interface LocalDatabase {
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

export const appDb: LocalDatabase = new MigrationDatabase(); // TODO should eventually be NeDb
export const playerDb: LocalDatabase = new NeDbDatabase();
export const playerDbLegacy: LocalDatabase = new ElectronStoreDatabase();

import { ElectronStoreDatabase } from "./ElectronStoreDatabase";
import { NeDbDatabase } from "./NeDbDatabase";
import { MigrationDatabase } from "./MigrationDatabase";

export class DatabaseNotInitializedError extends Error {
  constructor() {
    super("LocalDatabase has not been initialized.");
    this.name = "DatabaseNotInitializedError";
  }
}

/**
 * This represents a common API for any of the ways we know how to read and
 * write to the file system.
 */
export interface LocalDatabase {
  dbName: string;
  filePath: string;

  find(
    table: string,
    key: string,
    callback: (err: Error | null, data: any) => void
  ): void;

  findAll(callback: (err: Error | null, data: any) => void): void;

  init(dbName: string, arenaName?: string): void;

  upsert(
    table: string,
    key: string,
    data: any,
    callback?: (err: Error | null, num: number) => void
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

export const appDb: LocalDatabase = new MigrationDatabase(new ElectronStoreDatabase(), new NeDbDatabase());
export const playerDb: LocalDatabase = new NeDbDatabase();
export const playerDbLegacy: LocalDatabase = new ElectronStoreDatabase();

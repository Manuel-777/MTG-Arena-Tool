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

  find(table: string, key: string): Promise<any>;

  findAll(): Promise<any>;

  init(dbName: string, arenaName?: string): void;

  upsert(table: string, key: string, data: any): Promise<number>;

  /**
   * A not-necessarily atomic, destructive, bulk insert.
   * @param intermediateCallback if possible, the database will call this
   * between individual upserts. Useful for displaying progress.
   */
  upsertAll(
    data: any,
    intermediateCallback?: (err: Error | null, num: number) => void
  ): Promise<number>;

  remove(table: string, key: string): Promise<number>;
}

export const appDb: LocalDatabase = new MigrationDatabase(
  new ElectronStoreDatabase(),
  new NeDbDatabase()
);
export const playerDb: LocalDatabase = new NeDbDatabase();
export const playerDbLegacy: LocalDatabase = new ElectronStoreDatabase();

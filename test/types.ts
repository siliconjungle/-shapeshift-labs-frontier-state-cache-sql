import {
  createQueryCacheSqlStorageAdapter,
  type QueryCacheSqlExecutor,
  type QueryCacheSqlStorageAdapter,
  type QueryCacheSqlStorageOptions
} from '../dist/index.js';
import type {
  QueryCacheChangeLogEntry,
  QueryCacheStorageAdapter
} from '@shapeshift-labs/frontier-state-cache';

const connection: QueryCacheSqlExecutor = {
  execute() {
    return { rows: [] };
  },
  transaction(callback) {
    return callback(this);
  }
};

const options: QueryCacheSqlStorageOptions = {
  connection,
  dialect: 'postgres',
  snapshotTable: 'frontier.snapshots',
  changeLogTable: 'frontier.changes',
  snapshotKey: 'app',
  maxLogEntries: 10
};

const adapter: QueryCacheSqlStorageAdapter = createQueryCacheSqlStorageAdapter(options);
const storage: QueryCacheStorageAdapter = adapter;
const entry: QueryCacheChangeLogEntry = { seq: 1, type: 'clear' };

void storage;
void createQueryCacheSqlStorageAdapter(connection);
void adapter.initialize();
void adapter.appendChange(entry);
void adapter.readChangeLog({ sinceSeq: 0, limit: 1 });
void adapter.compact();

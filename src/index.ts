import type {
  QueryCacheChangeLogEntry,
  QueryCacheSnapshot,
  QueryCacheStorageAdapter
} from '@shapeshift-labs/frontier-state-cache';

const DEFAULT_SNAPSHOT_TABLE = 'frontier_state_cache_snapshots';
const DEFAULT_CHANGE_LOG_TABLE = 'frontier_state_cache_changes';
const DEFAULT_SNAPSHOT_KEY = 'default';
const SNAPSHOT_MAGIC = 'frontier-state-cache-sql-snapshot';
const CHANGE_LOG_MAGIC = 'frontier-state-cache-sql-change';
const RECORD_VERSION = 1;

export type QueryCacheSqlDialect = 'sqlite' | 'postgres';
export type QueryCacheSqlValue = string | number | boolean | null;
export type QueryCacheSqlRow = Record<string, unknown>;
export type QueryCacheSqlResult = QueryCacheSqlRow[] | { rows?: QueryCacheSqlRow[]; rowCount?: number } | undefined | null;

export interface QueryCacheSqlExecutor {
  execute(sql: string, params?: readonly QueryCacheSqlValue[]): QueryCacheSqlResult | Promise<QueryCacheSqlResult>;
  transaction?<T>(callback: (executor: QueryCacheSqlExecutor) => T | Promise<T>): T | Promise<T>;
}

export interface QueryCacheSqlStorageOptions {
  connection: QueryCacheSqlExecutor;
  dialect?: QueryCacheSqlDialect;
  snapshotTable?: string;
  changeLogTable?: string;
  snapshotKey?: string;
  createTables?: boolean;
  now?: () => number;
  maxLogEntries?: number;
}

export interface QueryCacheSqlTables {
  snapshotTable: string;
  changeLogTable: string;
}

export interface QueryCacheSqlChangeLogReadOptions {
  sinceSeq?: number;
  limit?: number;
}

export interface QueryCacheSqlChangeLogRecord {
  magic: typeof CHANGE_LOG_MAGIC;
  version: typeof RECORD_VERSION;
  createdAt: number;
  entry: QueryCacheChangeLogEntry;
}

export interface QueryCacheSqlStorageAdapter extends QueryCacheStorageAdapter {
  readonly dialect: QueryCacheSqlDialect;
  readonly snapshotTable: string;
  readonly changeLogTable: string;
  readonly snapshotKey: string;
  initialize(): Promise<void>;
  getTables(): QueryCacheSqlTables;
  appendChange(entry: QueryCacheChangeLogEntry): Promise<void>;
  readChangeLog(options?: QueryCacheSqlChangeLogReadOptions): Promise<QueryCacheChangeLogEntry[]>;
  compact(snapshot?: QueryCacheSnapshot): Promise<void>;
  destroy(): Promise<void>;
}

type QueryCacheSqlSnapshotEnvelope = {
  magic: typeof SNAPSHOT_MAGIC;
  version: typeof RECORD_VERSION;
  savedAt: number;
  snapshot: QueryCacheSnapshot;
};

type NormalizedOptions = Required<
  Pick<
    QueryCacheSqlStorageOptions,
    'connection' | 'dialect' | 'snapshotTable' | 'changeLogTable' | 'snapshotKey' | 'createTables' | 'now' | 'maxLogEntries'
  >
>;

export function createQueryCacheSqlStorageAdapter(
  options: QueryCacheSqlExecutor | QueryCacheSqlStorageOptions
): QueryCacheSqlStorageAdapter {
  const normalized = normalizeOptions(options);
  const connection = normalized.connection;
  const snapshotTableSql = quoteQualifiedIdentifier(normalized.snapshotTable);
  const changeLogTableSql = quoteQualifiedIdentifier(normalized.changeLogTable);
  const param = createPlaceholderFactory(normalized.dialect);
  let initialized = false;
  let initializePromise: Promise<void> | undefined;

  const adapter: QueryCacheSqlStorageAdapter = {
    dialect: normalized.dialect,
    snapshotTable: normalized.snapshotTable,
    changeLogTable: normalized.changeLogTable,
    snapshotKey: normalized.snapshotKey,
    initialize,
    getTables() {
      return {
        snapshotTable: normalized.snapshotTable,
        changeLogTable: normalized.changeLogTable
      };
    },
    async load() {
      await initialize();
      const rows = await queryRows(
        connection,
        `SELECT format, version, snapshot_json FROM ${snapshotTableSql} WHERE snapshot_key = ${param(1)} LIMIT 1`,
        [normalized.snapshotKey]
      );
      if (rows.length === 0) return null;
      const envelope = parseSnapshotEnvelope(readColumn(rows[0], 'snapshot_json'));
      return cloneSnapshot(envelope.snapshot);
    },
    async save(snapshot) {
      await initialize();
      await saveSnapshot(connection, snapshot);
    },
    async clear() {
      await runInTransaction(async (executor) => {
        await initializeWith(executor);
        await executeSql(executor, `DELETE FROM ${changeLogTableSql} WHERE snapshot_key = ${param(1)}`, [normalized.snapshotKey]);
        await executeSql(executor, `DELETE FROM ${snapshotTableSql} WHERE snapshot_key = ${param(1)}`, [normalized.snapshotKey]);
      });
    },
    async appendChange(entry) {
      assertChangeLogEntry(entry);
      await initialize();
      await appendChangeRecord(connection, entry);
      if (normalized.maxLogEntries > 0) await trimChangeLog(connection, normalized.maxLogEntries);
    },
    async readChangeLog(options = {}) {
      await initialize();
      const builder = createSqlBuilder(param);
      let sql = `SELECT entry_json FROM ${changeLogTableSql} WHERE snapshot_key = ${builder.add(normalized.snapshotKey)}`;
      const sinceSeq = Number(options.sinceSeq);
      if (Number.isFinite(sinceSeq)) sql += ` AND seq > ${builder.add(Math.floor(sinceSeq))}`;
      sql += ' ORDER BY seq ASC';
      const limit = readPositiveInt(options.limit, 0);
      if (limit > 0) sql += ` LIMIT ${builder.add(limit)}`;
      const rows = await queryRows(connection, sql, builder.params);
      return rows.map((row) => parseChangeLogRecord(readColumn(row, 'entry_json')).entry);
    },
    async compact(snapshot) {
      await runInTransaction(async (executor) => {
        await initializeWith(executor);
        if (snapshot !== undefined) await saveSnapshot(executor, snapshot);
        await executeSql(executor, `DELETE FROM ${changeLogTableSql} WHERE snapshot_key = ${param(1)}`, [normalized.snapshotKey]);
      });
    },
    async destroy() {
      await adapter.clear();
    }
  };

  return adapter;

  async function initialize(): Promise<void> {
    if (initialized || normalized.createTables === false) return;
    if (initializePromise === undefined) {
      initializePromise = initializeWith(connection).then(() => {
        initialized = true;
      });
    }
    await initializePromise;
  }

  async function initializeWith(executor: QueryCacheSqlExecutor): Promise<void> {
    if (initialized || normalized.createTables === false) return;
    await executeSql(
      executor,
      `CREATE TABLE IF NOT EXISTS ${snapshotTableSql} (` +
        'snapshot_key TEXT PRIMARY KEY, ' +
        'format TEXT NOT NULL, ' +
        'version INTEGER NOT NULL, ' +
        'saved_at INTEGER NOT NULL, ' +
        'snapshot_json TEXT NOT NULL' +
        ')'
    );
    await executeSql(
      executor,
      `CREATE TABLE IF NOT EXISTS ${changeLogTableSql} (` +
        'snapshot_key TEXT NOT NULL, ' +
        'seq INTEGER NOT NULL, ' +
        'created_at INTEGER NOT NULL, ' +
        'entry_json TEXT NOT NULL, ' +
        'PRIMARY KEY (snapshot_key, seq)' +
        ')'
    );
  }

  async function saveSnapshot(executor: QueryCacheSqlExecutor, snapshot: QueryCacheSnapshot): Promise<void> {
    const envelope: QueryCacheSqlSnapshotEnvelope = {
      magic: SNAPSHOT_MAGIC,
      version: RECORD_VERSION,
      savedAt: normalized.now(),
      snapshot: cloneSnapshot(snapshot)
    };
    await executeSql(
      executor,
      `INSERT INTO ${snapshotTableSql} (snapshot_key, format, version, saved_at, snapshot_json) ` +
        `VALUES (${param(1)}, ${param(2)}, ${param(3)}, ${param(4)}, ${param(5)}) ` +
        'ON CONFLICT (snapshot_key) DO UPDATE SET ' +
        'format = EXCLUDED.format, ' +
        'version = EXCLUDED.version, ' +
        'saved_at = EXCLUDED.saved_at, ' +
        'snapshot_json = EXCLUDED.snapshot_json',
      [
        normalized.snapshotKey,
        SNAPSHOT_MAGIC,
        RECORD_VERSION,
        envelope.savedAt,
        JSON.stringify(envelope)
      ]
    );
  }

  async function appendChangeRecord(executor: QueryCacheSqlExecutor, entry: QueryCacheChangeLogEntry): Promise<void> {
    const record: QueryCacheSqlChangeLogRecord = {
      magic: CHANGE_LOG_MAGIC,
      version: RECORD_VERSION,
      createdAt: normalized.now(),
      entry: cloneChangeLogEntry(entry)
    };
    await executeSql(
      executor,
      `INSERT INTO ${changeLogTableSql} (snapshot_key, seq, created_at, entry_json) ` +
        `VALUES (${param(1)}, ${param(2)}, ${param(3)}, ${param(4)}) ` +
        'ON CONFLICT (snapshot_key, seq) DO UPDATE SET ' +
        'created_at = EXCLUDED.created_at, ' +
        'entry_json = EXCLUDED.entry_json',
      [
        normalized.snapshotKey,
        Math.floor(entry.seq),
        record.createdAt,
        JSON.stringify(record)
      ]
    );
  }

  async function trimChangeLog(executor: QueryCacheSqlExecutor, maxEntries: number): Promise<void> {
    await executeSql(
      executor,
      `DELETE FROM ${changeLogTableSql} WHERE snapshot_key = ${param(1)} AND seq NOT IN (` +
        `SELECT seq FROM (SELECT seq FROM ${changeLogTableSql} WHERE snapshot_key = ${param(2)} ORDER BY seq DESC LIMIT ${param(3)}) retained` +
        ')',
      [normalized.snapshotKey, normalized.snapshotKey, maxEntries]
    );
  }

  async function runInTransaction<T>(callback: (executor: QueryCacheSqlExecutor) => T | Promise<T>): Promise<T> {
    if (typeof connection.transaction === 'function') return await connection.transaction(callback);
    return await callback(connection);
  }
}

function normalizeOptions(options: QueryCacheSqlExecutor | QueryCacheSqlStorageOptions): NormalizedOptions {
  const raw = isExecutor(options) ? { connection: options } : options;
  if (!isExecutor(raw.connection)) {
    throw new TypeError('createQueryCacheSqlStorageAdapter requires a connection with execute(sql, params)');
  }
  return {
    connection: raw.connection,
    dialect: raw.dialect === 'postgres' ? 'postgres' : 'sqlite',
    snapshotTable: normalizeIdentifier(raw.snapshotTable, DEFAULT_SNAPSHOT_TABLE, 'snapshotTable'),
    changeLogTable: normalizeIdentifier(raw.changeLogTable, DEFAULT_CHANGE_LOG_TABLE, 'changeLogTable'),
    snapshotKey: normalizeSnapshotKey(raw.snapshotKey),
    createTables: raw.createTables !== false,
    now: typeof raw.now === 'function' ? raw.now : Date.now,
    maxLogEntries: readPositiveInt(raw.maxLogEntries, 0)
  };
}

function isExecutor(value: unknown): value is QueryCacheSqlExecutor {
  return typeof value === 'object' && value !== null && typeof (value as QueryCacheSqlExecutor).execute === 'function';
}

function normalizeIdentifier(value: unknown, fallback: string, label: string): string {
  const text = value === undefined ? fallback : value;
  if (typeof text !== 'string' || text.length === 0) {
    throw new TypeError('createQueryCacheSqlStorageAdapter ' + label + ' must be a non-empty SQL identifier');
  }
  for (const part of text.split('.')) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      throw new TypeError('createQueryCacheSqlStorageAdapter ' + label + ' must contain only simple SQL identifiers');
    }
  }
  return text;
}

function normalizeSnapshotKey(value: unknown): string {
  if (value === undefined) return DEFAULT_SNAPSHOT_KEY;
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('createQueryCacheSqlStorageAdapter snapshotKey must be a non-empty string');
  }
  return value;
}

function quoteQualifiedIdentifier(identifier: string): string {
  return identifier.split('.').map((part) => '"' + part + '"').join('.');
}

function createPlaceholderFactory(dialect: QueryCacheSqlDialect): (index: number) => string {
  return dialect === 'postgres' ? (index) => '$' + index : () => '?';
}

function createSqlBuilder(param: (index: number) => string): { params: QueryCacheSqlValue[]; add(value: QueryCacheSqlValue): string } {
  const params: QueryCacheSqlValue[] = [];
  return {
    params,
    add(value) {
      params.push(value);
      return param(params.length);
    }
  };
}

async function executeSql(
  executor: QueryCacheSqlExecutor,
  sql: string,
  params: readonly QueryCacheSqlValue[] = []
): Promise<QueryCacheSqlResult> {
  return await executor.execute(sql, params);
}

async function queryRows(
  executor: QueryCacheSqlExecutor,
  sql: string,
  params: readonly QueryCacheSqlValue[] = []
): Promise<QueryCacheSqlRow[]> {
  const result = await executeSql(executor, sql, params);
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

function readColumn(row: QueryCacheSqlRow, name: string): unknown {
  if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  const camel = name.replace(/_([a-z])/g, (_, part: string) => part.toUpperCase());
  if (Object.prototype.hasOwnProperty.call(row, camel)) return row[camel];
  return undefined;
}

function parseSnapshotEnvelope(value: unknown): QueryCacheSqlSnapshotEnvelope {
  if (typeof value !== 'string') throw new Error('SQL snapshot row is missing snapshot_json');
  const envelope = JSON.parse(value) as QueryCacheSqlSnapshotEnvelope;
  if (envelope.magic !== SNAPSHOT_MAGIC || envelope.version !== RECORD_VERSION) {
    throw new Error('SQL row is not a Frontier state-cache snapshot');
  }
  assertSnapshot(envelope.snapshot);
  return envelope;
}

function parseChangeLogRecord(value: unknown): QueryCacheSqlChangeLogRecord {
  if (typeof value !== 'string') throw new Error('SQL change-log row is missing entry_json');
  const record = JSON.parse(value) as QueryCacheSqlChangeLogRecord;
  if (record.magic !== CHANGE_LOG_MAGIC || record.version !== RECORD_VERSION) {
    throw new Error('SQL row is not a Frontier state-cache change-log record');
  }
  assertChangeLogEntry(record.entry);
  return {
    ...record,
    entry: cloneChangeLogEntry(record.entry)
  };
}

function assertSnapshot(snapshot: QueryCacheSnapshot): void {
  if (
    snapshot === null ||
    typeof snapshot !== 'object' ||
    snapshot.entities === null ||
    typeof snapshot.entities !== 'object' ||
    !Array.isArray(snapshot.queries)
  ) {
    throw new Error('SQL row contains an invalid Frontier state-cache snapshot');
  }
}

function assertChangeLogEntry(entry: QueryCacheChangeLogEntry): void {
  if (entry === null || typeof entry !== 'object' || !Number.isFinite(entry.seq) || typeof entry.type !== 'string') {
    throw new Error('Invalid Frontier state-cache change-log entry');
  }
}

function cloneSnapshot(snapshot: QueryCacheSnapshot): QueryCacheSnapshot {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(snapshot);
  return JSON.parse(JSON.stringify(snapshot)) as QueryCacheSnapshot;
}

function cloneChangeLogEntry(entry: QueryCacheChangeLogEntry): QueryCacheChangeLogEntry {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(entry);
  return JSON.parse(JSON.stringify(entry)) as QueryCacheChangeLogEntry;
}

function readPositiveInt(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

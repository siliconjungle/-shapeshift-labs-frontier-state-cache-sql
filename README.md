# Frontier State Cache SQL

SQL persistence adapter for Frontier state-cache snapshots and bounded change logs.

This package lets Frontier sit beside SQLite, Postgres, or a compatible SQL client as a local change/persistence layer. The database owns storage, indexing, transactions, backup, and operational policy; Frontier owns the structured JSON snapshot and change-log semantics.

- npm: [`@shapeshift-labs/frontier-state-cache-sql`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-sql)
- source: [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- cache: [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache)
- license: MIT

## Related Packages

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): core JSON diff/apply primitives below the state-cache package.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): shared query-key, selector path, condition, identity, and table-schema primitives.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): normalized query-result cache with entity/query watchers, persistence hooks, change logs, optimistic layers, and mutation bridge helpers.
- [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb): browser IndexedDB persistence adapter for the same cache snapshot contract.
- [`@shapeshift-labs/frontier-state-cache-file`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-file): Node/Electron/CLI structured-file persistence adapter.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-file`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-file)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)

## Install

```sh
npm install @shapeshift-labs/frontier-state-cache @shapeshift-labs/frontier-state-cache-sql
```

Install your database driver separately. The adapter accepts a structural `execute(sql, params)` connection and does not bundle SQLite, Postgres, or any database engine.

## Usage

```js
import {
  createQueryCache,
  persistQueryCache
} from '@shapeshift-labs/frontier-state-cache';
import { createQueryCacheSqlStorageAdapter } from '@shapeshift-labs/frontier-state-cache-sql';

const db = {
  execute(sql, params) {
    return sqlite.prepare(sql).all(...(params || []));
  },
  transaction(callback) {
    return sqlite.transaction(() => callback(db))();
  }
};

const cache = createQueryCache();
const storage = createQueryCacheSqlStorageAdapter({
  connection: db,
  dialect: 'sqlite',
  snapshotKey: 'app-cache',
  maxLogEntries: 1024
});

const persistence = persistQueryCache(cache, storage, {
  debounceMs: 25
});

await storage.initialize();
await persistence.hydrate();
```

## API

```ts
import {
  createQueryCacheSqlStorageAdapter,
  type QueryCacheSqlExecutor,
  type QueryCacheSqlStorageAdapter,
  type QueryCacheSqlStorageOptions
} from '@shapeshift-labs/frontier-state-cache-sql';
```

- `createQueryCacheSqlStorageAdapter(options)` creates a `QueryCacheStorageAdapter`.
- `initialize()` creates the two tables when `createTables !== false`.
- `load()`, `save(snapshot)`, and `clear()` match the state-cache persistence contract.
- `appendChange(entry)` upserts a structured `QueryCacheChangeLogEntry`.
- `readChangeLog({ sinceSeq, limit })` reads retained log entries.
- `compact(snapshot?)` writes an optional snapshot and clears the log inside the provided transaction hook when available.
- `destroy()` clears rows for the adapter's `snapshotKey`; it does not drop database tables.

Passing a `QueryCacheSqlExecutor` directly is shorthand for `{ connection }`.

## SQL Shape

Default tables:

```sql
CREATE TABLE IF NOT EXISTS frontier_state_cache_snapshots (
  snapshot_key TEXT PRIMARY KEY,
  format TEXT NOT NULL,
  version INTEGER NOT NULL,
  saved_at INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS frontier_state_cache_changes (
  snapshot_key TEXT NOT NULL,
  seq INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  entry_json TEXT NOT NULL,
  PRIMARY KEY (snapshot_key, seq)
);
```

`snapshot_json` is a Frontier envelope with a format marker, version, `savedAt`, and the state-cache snapshot. `entry_json` is a Frontier envelope over a `QueryCacheChangeLogEntry`.

This package does not attempt to be a database engine. It does not own secondary indexes, migrations, connection pools, WAL settings, vacuum policy, replication, or query planning. Use `snapshotTable`, `changeLogTable`, and `createTables: false` when your application owns DDL.

## Options

```ts
interface QueryCacheSqlStorageOptions {
  connection: QueryCacheSqlExecutor;
  dialect?: 'sqlite' | 'postgres';
  snapshotTable?: string;
  changeLogTable?: string;
  snapshotKey?: string;
  createTables?: boolean;
  now?: () => number;
  maxLogEntries?: number;
}
```

The `dialect` option only controls placeholder syntax: `?` for SQLite-compatible clients and `$1` for Postgres-compatible clients.

## Verification

```sh
npm test
npm run fuzz
npm run bench
npm run pack:dry
```

## Benchmarks

Run the package-local benchmark:

```sh
npm run bench
```

Latest local package benchmark on Node v26.1.0 with the package memory SQL test shim, 3 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| SQL snapshot save | 1,097.96 us | 1,473.50 us |
| SQL snapshot load | 2,759.75 us | 3,178.92 us |
| SQL change-log append | 7.46 us | 11.29 us |
| SQL change-log read | 113.58 us | 134.71 us |
| SQL snapshot compact | 1,022.67 us | 1,213.71 us |
| SQL snapshot clear | 2.46 us | 4.67 us |

These are Frontier-only package measurements, not competitor comparisons. Real SQLite/Postgres timings depend on the driver, transaction mode, storage medium, and database configuration.

## License

MIT. See [LICENSE](./LICENSE).

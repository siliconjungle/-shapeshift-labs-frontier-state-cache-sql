# Frontier State Cache SQL

SQL persistence adapter for Frontier state-cache snapshots and bounded change logs.

This package lets Frontier sit beside SQLite, Postgres, or a compatible SQL client as a local change/persistence layer. The database owns storage, indexing, transactions, backup, and operational policy; Frontier owns the structured JSON snapshot and change-log semantics.

- npm: [`@shapeshift-labs/frontier-state-cache-sql`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-sql)
- source: [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- cache: [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache)
- license: MIT

## Related Packages

The published Frontier package family is generated from one shared package catalog so READMEs stay in sync across packages:

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): Core JSON diff/apply, compact patch tuples, JSON Pointer, equality, clone, validation, Unicode helpers.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): Shared query-key, selector path, condition, entity identity, and table-shape primitives.
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec): Patch serialization, binary frames, canonical JSON, and patch-history codecs.
- [`@shapeshift-labs/frontier-engine`](https://www.npmjs.com/package/@shapeshift-labs/frontier-engine): Stateful planned diff engine, adaptive profiles, schema plans, and engine-level history helpers.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): Patch-routed app-state subscriptions, owned commits, maintained views, and path mapping.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): Normalized query-result cache with entity/query watchers, persistence, change logs, optimistic layers, and mutation bridge.
- [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb): IndexedDB persistence adapter for Frontier state-cache snapshots.
- [`@shapeshift-labs/frontier-state-cache-file`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-file): Structured file persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-schema`](https://www.npmjs.com/package/@shapeshift-labs/frontier-schema): JSON Schema validation, Frontier profile generation, CloudEvent envelopes, and query/table schema helpers.
- [`@shapeshift-labs/frontier-event-log`](https://www.npmjs.com/package/@shapeshift-labs/frontier-event-log): Bounded event logs, replay cursors, consumer acknowledgements, keyed compaction, checkpoints, and Frontier patch event records.
- [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging): Opt-in structured logging, browser telemetry, file sinks, exporters, benchmark traces, and Frontier patch/update summaries.
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation): Explicit mutation and selector plans compiled to Frontier patches or CRDT operations.
- [`@shapeshift-labs/frontier-crdt`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt): Native CRDT documents, update tooling, awareness, branches, conflict introspection, version frames, and undo.
- [`@shapeshift-labs/frontier-crdt-sync`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-sync): CRDT sync endpoints, repo/storage/provider contracts, document URLs, local networks, model checking, forensics, and text binding contracts.
- [`@shapeshift-labs/frontier-crdt-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-websocket): WebSocket client/server transports for Frontier CRDT sync providers.
- [`@shapeshift-labs/frontier-react`](https://www.npmjs.com/package/@shapeshift-labs/frontier-react): React external-store hooks and adapters for Frontier state, cache, and CRDT surfaces.
- [`@shapeshift-labs/frontier-richtext`](https://www.npmjs.com/package/@shapeshift-labs/frontier-richtext): Rich text Delta normalization/application, marks, embeds, ranges, and cursor/selection transforms for local editor integrations.
- [`@shapeshift-labs/frontier-realtime`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime): Shared realtime command, tick, snapshot, prediction, reconciliation, interpolation, rollback, message, and delta primitives.
- [`@shapeshift-labs/frontier-realtime-server`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-server): Authoritative realtime room, tick, command validation, rate-limit, session, and snapshot-history runtime.
- [`@shapeshift-labs/frontier-realtime-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-websocket): WebSocket client, wire, and Node room-server transport for Frontier realtime.
- [`@shapeshift-labs/frontier-game`](https://www.npmjs.com/package/@shapeshift-labs/frontier-game): Game-facing entity, component, player, room, ownership, spatial interest, rollback, physics, and replication helpers above realtime.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-codec`](https://github.com/siliconjungle/-shapeshift-labs-frontier-codec)
- [`siliconjungle/-shapeshift-labs-frontier-engine`](https://github.com/siliconjungle/-shapeshift-labs-frontier-engine)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-file`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-file)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- [`siliconjungle/-shapeshift-labs-frontier-schema`](https://github.com/siliconjungle/-shapeshift-labs-frontier-schema)
- [`siliconjungle/-shapeshift-labs-frontier-event-log`](https://github.com/siliconjungle/-shapeshift-labs-frontier-event-log)
- [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- [`siliconjungle/-shapeshift-labs-frontier-mutation`](https://github.com/siliconjungle/-shapeshift-labs-frontier-mutation)
- [`siliconjungle/-shapeshift-labs-frontier-crdt`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-sync`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-sync)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- [`siliconjungle/-shapeshift-labs-frontier-richtext`](https://github.com/siliconjungle/-shapeshift-labs-frontier-richtext)
- [`siliconjungle/-shapeshift-labs-frontier-realtime`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-server`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-server)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-game`](https://github.com/siliconjungle/-shapeshift-labs-frontier-game)

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

await storage.initialize();

const persistence = persistQueryCache(cache, storage, {
  autoHydrate: true,
  debounceMs: 25
});

await persistence.ready;

cache.writeQuery(['todos'], [
  { __typename: 'Todo', id: '1', text: 'Ship', done: false }
]);

await persistence.flush();
const retainedChanges = await storage.readChangeLog();
```

`persistQueryCache()` appends structured cache changes to the adapter change-log table automatically because this adapter exposes `appendChange(entry)`. On a restarted process it reads the retained log once and continues from the highest retained `seq`. Use `compactOnFlush: true` when a flush should write a checkpoint snapshot and clear the adapter-owned log in the same transaction hook.

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

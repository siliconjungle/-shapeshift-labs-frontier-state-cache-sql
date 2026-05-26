import { createQueryCacheSqlStorageAdapter } from '../dist/index.js';
import { createFakeSqlConnection } from '../test/fake-sql.mjs';

const args = parseArgs(process.argv.slice(2));
const rounds = readPositiveInt(args.rounds, 3);
const iterations = readPositiveInt(args.iterations, 500);

const rows = [];
rows.push(await measureSave(rounds, iterations));
rows.push(await measureLoad(rounds, iterations));
rows.push(await measureAppend(rounds, iterations));
rows.push(await measureReadLog(rounds, iterations));
rows.push(await measureCompact(rounds, iterations));
rows.push(await measureClear(rounds, iterations));

console.log('Frontier-only package measurements');
console.log(padRight('fixture', 38) + padLeft('median us', 12) + padLeft('p95 us', 10) + padLeft('events', 9));
for (const row of rows) {
  console.log(
    padRight(row.name, 38) +
      padLeft(row.median.toFixed(2), 12) +
      padLeft(row.p95.toFixed(2), 10) +
      padLeft(String(row.count), 9)
  );
}

async function measureSave(rounds, iterations) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const storage = createQueryCacheSqlStorageAdapter({
      connection: createFakeSqlConnection()
    });
    const snapshot = makeSnapshot(1000);
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await storage.save(snapshot);
      samples.push((performance.now() - start) * 1000);
    }
    await storage.destroy();
  }
  return row('sql snapshot save', samples);
}

async function measureLoad(rounds, iterations) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const storage = createQueryCacheSqlStorageAdapter({
      connection: createFakeSqlConnection()
    });
    await storage.save(makeSnapshot(1000));
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await storage.load();
      samples.push((performance.now() - start) * 1000);
    }
    await storage.destroy();
  }
  return row('sql snapshot load', samples);
}

async function measureAppend(rounds, iterations) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const storage = createQueryCacheSqlStorageAdapter({
      connection: createFakeSqlConnection()
    });
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await storage.appendChange({ seq: i + 1, type: 'query', key: ['todos'], hash: 'todos', patchOperations: 1, stale: false, updatedAt: i });
      samples.push((performance.now() - start) * 1000);
    }
    await storage.destroy();
  }
  return row('sql change-log append', samples);
}

async function measureReadLog(rounds, iterations) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const storage = createQueryCacheSqlStorageAdapter({
      connection: createFakeSqlConnection()
    });
    for (let i = 0; i < 128; i++) {
      await storage.appendChange({ seq: i + 1, type: 'entity', entityId: 'Todo:' + i, patchOperations: 1 });
    }
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await storage.readChangeLog({ sinceSeq: 64 });
      samples.push((performance.now() - start) * 1000);
    }
    await storage.destroy();
  }
  return row('sql change-log read', samples);
}

async function measureCompact(rounds, iterations) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const storage = createQueryCacheSqlStorageAdapter({
      connection: createFakeSqlConnection()
    });
    const snapshot = makeSnapshot(1000);
    for (let i = 0; i < iterations; i++) {
      await storage.appendChange({ seq: i + 1, type: 'clear' });
      const start = performance.now();
      await storage.compact(snapshot);
      samples.push((performance.now() - start) * 1000);
    }
    await storage.destroy();
  }
  return row('sql snapshot compact', samples);
}

async function measureClear(rounds, iterations) {
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    const storage = createQueryCacheSqlStorageAdapter({
      connection: createFakeSqlConnection()
    });
    const snapshot = makeSnapshot(1000);
    for (let i = 0; i < iterations; i++) {
      await storage.save(snapshot);
      const start = performance.now();
      await storage.clear();
      samples.push((performance.now() - start) * 1000);
    }
    await storage.destroy();
  }
  return row('sql snapshot clear', samples);
}

function makeSnapshot(count) {
  const entities = {};
  const value = [];
  const dependencies = [];
  for (let i = 0; i < count; i++) {
    const id = 'Todo:' + i;
    entities[id] = { __typename: 'Todo', id: String(i), text: 'todo-' + i, done: i % 2 === 0 };
    value.push({ __typename: 'Todo', id: String(i), text: 'todo-' + i, done: i % 2 === 0 });
    dependencies.push(id);
  }
  return {
    entities,
    queries: [
      {
        key: ['todos'],
        hash: 'todos',
        root: value,
        value,
        dependencies,
        stale: false,
        updatedAt: 1
      }
    ]
  };
}

function row(name, samples) {
  samples.sort((a, b) => a - b);
  return {
    name,
    count: samples.length,
    median: percentile(samples, 0.5),
    p95: percentile(samples, 0.95)
  };
}

function percentile(samples, pct) {
  if (samples.length === 0) return 0;
  return samples[Math.min(samples.length - 1, Math.floor(samples.length * pct))];
}

function padRight(value, size) {
  return String(value).padEnd(size, ' ');
}

function padLeft(value, size) {
  return String(value).padStart(size, ' ');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--rounds') out.rounds = argv[++i];
    else if (arg === '--iterations') out.iterations = argv[++i];
    else throw new Error('unknown argument: ' + arg);
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

import assert from 'node:assert';
import {
  createQueryCache,
  mergeOffsetPage,
  persistQueryCache
} from '@shapeshift-labs/frontier-state-cache';
import { createQueryCacheSqlStorageAdapter } from '../dist/index.js';
import { createFakeSqlConnection } from './fake-sql.mjs';

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 120);
const seed = readPositiveInt(args.seed, 0x501cace);
const rng = mulberry32(seed);

for (let id = 0; id < cases; id++) {
  const localRng = mulberry32((rng() * 0xffffffff) >>> 0);
  await runCase(id, localRng);
}

console.log('frontier state-cache-sql fuzz passed cases=' + cases + ' seed=' + seed);

async function runCase(caseId, rng) {
  const connection = createFakeSqlConnection();
  const storage = createQueryCacheSqlStorageAdapter({
    connection,
    dialect: randomInt(rng, 2) === 0 ? 'sqlite' : 'postgres',
    snapshotKey: 'case-' + caseId,
    maxLogEntries: 16,
    now: () => caseId
  });
  const cache = createQueryCache({ now: () => caseId });
  const persistence = persistQueryCache(cache, storage, { debounceMs: 1000000 });
  const expectedByGroup = new Map();
  const groups = makeGroups(rng);
  let seq = 0;

  for (const group of groups) {
    const todos = makeTodos(group, rng);
    expectedByGroup.set(group, clone(todos));
    cache.writeQuery(['todos', { group }], todos);
    await storage.appendChange({ seq: ++seq, type: 'query', key: ['todos', { group }], hash: cache.getQueryHash(['todos', { group }]), patchOperations: todos.length, stale: false, updatedAt: caseId });
  }
  await persistence.flush();

  for (let step = 0; step < 16; step++) {
    const group = groups[randomInt(rng, groups.length)];
    const todos = expectedByGroup.get(group);
    if (randomInt(rng, 3) === 0 || todos.length === 0) {
      const page = [makeUniqueTodo(group, todos, rng)];
      cache.writeQuery(['todos', { group }], page, {
        merge: (existing, incoming) => mergeOffsetPage(existing, incoming, { offset: todos.length })
      });
      todos.push(clone(page[0]));
      await storage.appendChange({ seq: ++seq, type: 'query', key: ['todos', { group }], hash: cache.getQueryHash(['todos', { group }]), patchOperations: 1, stale: false, updatedAt: caseId });
    } else {
      const index = randomInt(rng, todos.length);
      const id = todos[index].id;
      cache.modifyEntity('Todo:' + id, (todo) => ({
        ...todo,
        done: !todo.done,
        revision: Number(todo.revision || 0) + 1
      }));
      todos[index].done = !todos[index].done;
      todos[index].revision++;
      await storage.appendChange({ seq: ++seq, type: 'entity', entityId: 'Todo:' + id, patchOperations: 1 });
    }

    await persistence.flush();

    const restored = createQueryCache();
    const restoredPersistence = persistQueryCache(restored, storage);
    assert.strictEqual(await restoredPersistence.hydrate(), true);
    for (const item of groups) {
      assert.deepStrictEqual(restored.getQueryData(['todos', { group: item }]), expectedByGroup.get(item));
    }
    restoredPersistence.dispose();

    const log = await storage.readChangeLog();
    assert.ok(log.length <= 16);
    assert.ok(log.every((entry, index) => index === 0 || entry.seq > log[index - 1].seq));
  }

  const latestSnapshot = cache.extract();
  await storage.compact(latestSnapshot);
  assert.deepStrictEqual(await storage.readChangeLog(), []);
  assert.deepStrictEqual(await storage.load(), latestSnapshot);

  persistence.dispose();
  await storage.destroy();
}

function makeGroups(rng) {
  const count = 2 + randomInt(rng, 3);
  const groups = [];
  for (let i = 0; i < count; i++) groups.push('g' + i);
  return groups;
}

function makeTodos(group, rng) {
  const count = 2 + randomInt(rng, 8);
  const todos = [];
  for (let i = 0; i < count; i++) todos.push(makeTodo(group, i, rng));
  return todos;
}

function makeTodo(group, index, rng) {
  return {
    __typename: 'Todo',
    id: group + '-' + index,
    group,
    text: 'todo-' + group + '-' + index,
    done: randomInt(rng, 2) === 0,
    revision: 0
  };
}

function makeUniqueTodo(group, todos, rng) {
  const existing = new Set(todos.map((todo) => todo.id));
  let index = todos.length + randomInt(rng, 1000);
  while (existing.has(group + '-' + index)) index++;
  return makeTodo(group, index, rng);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function randomInt(rng, max) {
  return Math.floor(rng() * max);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cases') out.cases = argv[++i];
    else if (arg === '--seed') out.seed = argv[++i];
    else throw new Error('unknown argument: ' + arg);
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

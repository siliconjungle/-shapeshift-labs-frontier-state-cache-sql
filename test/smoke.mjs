import assert from 'node:assert';
import {
  createQueryCache,
  persistQueryCache
} from '@shapeshift-labs/frontier-state-cache';
import { createQueryCacheSqlStorageAdapter } from '../dist/index.js';
import { createFakeSqlConnection } from './fake-sql.mjs';

{
  const connection = createFakeSqlConnection();
  const storage = createQueryCacheSqlStorageAdapter({
    connection,
    now: () => 10
  });
  const snapshot = {
    entities: {
      'Todo:1': { __typename: 'Todo', id: '1', text: 'saved' }
    },
    queries: []
  };

  assert.strictEqual(await storage.load(), null);
  await storage.save(snapshot);
  snapshot.entities['Todo:1'].text = 'mutated';

  const loaded = await storage.load();
  assert.strictEqual(loaded.entities['Todo:1'].text, 'saved');
  loaded.entities['Todo:1'].text = 'mutated-again';
  assert.strictEqual((await storage.load()).entities['Todo:1'].text, 'saved');

  assert.ok(connection.statements.some((statement) => /create table/i.test(statement.sql)));
  await storage.clear();
  assert.strictEqual(await storage.load(), null);
  await storage.destroy();
}

{
  const connection = createFakeSqlConnection();
  const source = createQueryCache({ now: () => 20 });
  const storage = createQueryCacheSqlStorageAdapter({
    connection,
    snapshotKey: 'todos-cache'
  });
  const persistence = persistQueryCache(source, storage, { debounceMs: 1000 });

  source.writeQuery(['todos'], [
    { __typename: 'Todo', id: '1', text: 'ship', done: false }
  ]);
  await persistence.flush();
  assert.deepStrictEqual((await storage.readChangeLog()).map((entry) => entry.seq), [1, 2]);

  source.modifyEntity('Todo:1', (todo) => ({ ...todo, text: 'draft' }));
  assert.strictEqual((await storage.load()).queries[0].value[0].text, 'ship');
  await persistence.flush();
  assert.strictEqual((await storage.load()).queries[0].value[0].text, 'draft');
  assert.deepStrictEqual((await storage.readChangeLog()).map((entry) => entry.seq), [1, 2, 3, 4]);

  const restored = createQueryCache();
  const restoredPersistence = persistQueryCache(restored, storage);
  assert.strictEqual(await restoredPersistence.hydrate(), true);
  assert.deepStrictEqual(restored.getQueryData(['todos']), [
    { __typename: 'Todo', id: '1', text: 'draft', done: false }
  ]);

  const next = createQueryCache();
  const nextPersistence = persistQueryCache(next, storage, { debounceMs: 1000 });
  next.writeQuery(['todo', 2], { __typename: 'Todo', id: '2', text: 'next' });
  await nextPersistence.flush();
  assert.deepStrictEqual((await storage.readChangeLog()).map((entry) => entry.seq), [1, 2, 3, 4, 5, 6]);

  persistence.dispose();
  restoredPersistence.dispose();
  nextPersistence.dispose();
  await storage.destroy();
}

{
  const connection = createFakeSqlConnection();
  const storage = createQueryCacheSqlStorageAdapter({
    connection,
    maxLogEntries: 3,
    now: () => 30
  });

  await storage.appendChange({ seq: 1, type: 'query', key: ['todos'], hash: 'a', patchOperations: 1, stale: false, updatedAt: 1 });
  await storage.appendChange({ seq: 2, type: 'entity', entityId: 'Todo:1', patchOperations: 1 });
  await storage.appendChange({ seq: 3, type: 'invalidate', hash: 'a' });
  await storage.appendChange({ seq: 4, type: 'clear' });

  assert.deepStrictEqual((await storage.readChangeLog()).map((entry) => entry.seq), [2, 3, 4]);
  assert.deepStrictEqual((await storage.readChangeLog({ sinceSeq: 2 })).map((entry) => entry.seq), [3, 4]);
  assert.deepStrictEqual((await storage.readChangeLog({ limit: 1 })).map((entry) => entry.seq), [2]);

  await storage.compact({
    entities: {},
    queries: []
  });
  assert.deepStrictEqual(await storage.readChangeLog(), []);
  assert.deepStrictEqual(await storage.load(), {
    entities: {},
    queries: []
  });
}

{
  const connection = createFakeSqlConnection();
  const storage = createQueryCacheSqlStorageAdapter({
    connection,
    dialect: 'postgres',
    snapshotTable: 'frontier_snapshots',
    changeLogTable: 'frontier_changes'
  });
  await storage.initialize();
  await storage.save({ entities: {}, queries: [] });
  assert.ok(connection.statements.some((statement) => statement.sql.includes('$1')));
}

console.log('frontier state-cache-sql smoke passed');

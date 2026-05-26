export function createFakeSqlConnection() {
  return new FakeSqlConnection();
}

class FakeSqlConnection {
  snapshots = new Map();
  changes = new Map();
  statements = [];

  async execute(sql, params = []) {
    this.statements.push({ sql, params: Array.from(params) });
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalized.startsWith('create table')) return { rows: [], rowCount: 0 };

    if (normalized.startsWith('insert into') && normalized.includes('snapshot_json')) {
      const [snapshotKey, format, version, savedAt, snapshotJson] = params;
      this.snapshots.set(snapshotKey, { format, version, saved_at: savedAt, snapshot_json: snapshotJson });
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith('select') && normalized.includes('snapshot_json')) {
      const [snapshotKey] = params;
      const row = this.snapshots.get(snapshotKey);
      return { rows: row ? [clone(row)] : [], rowCount: row ? 1 : 0 };
    }

    if (normalized.startsWith('delete from') && normalized.includes('snapshot_json') === false && normalized.includes('frontier_state_cache_snapshots')) {
      const [snapshotKey] = params;
      const removed = this.snapshots.delete(snapshotKey);
      return { rows: [], rowCount: removed ? 1 : 0 };
    }

    if (normalized.startsWith('insert into') && normalized.includes('entry_json')) {
      const [snapshotKey, seq, createdAt, entryJson] = params;
      const entries = this.changes.get(snapshotKey) || [];
      const existing = entries.find((entry) => entry.seq === seq);
      if (existing) {
        existing.created_at = createdAt;
        existing.entry_json = entryJson;
      } else {
        entries.push({ seq, created_at: createdAt, entry_json: entryJson });
        entries.sort((a, b) => a.seq - b.seq);
      }
      this.changes.set(snapshotKey, entries);
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith('select') && normalized.includes('entry_json')) {
      const snapshotKey = params[0];
      const hasSince = normalized.includes('seq >');
      const hasLimit = normalized.includes(' limit ');
      let index = 1;
      const sinceSeq = hasSince ? Number(params[index++]) : -Infinity;
      const limit = hasLimit ? Number(params[index++]) : 0;
      let rows = (this.changes.get(snapshotKey) || [])
        .filter((entry) => entry.seq > sinceSeq)
        .sort((a, b) => a.seq - b.seq)
        .map((entry) => ({ entry_json: entry.entry_json }));
      if (limit > 0) rows = rows.slice(0, limit);
      return { rows: clone(rows), rowCount: rows.length };
    }

    if (normalized.startsWith('delete from') && normalized.includes('frontier_state_cache_changes') && normalized.includes('not in')) {
      const [snapshotKey, , maxEntries] = params;
      const entries = (this.changes.get(snapshotKey) || []).sort((a, b) => a.seq - b.seq);
      const keep = entries.slice(Math.max(0, entries.length - Number(maxEntries)));
      this.changes.set(snapshotKey, keep);
      return { rows: [], rowCount: entries.length - keep.length };
    }

    if (normalized.startsWith('delete from') && normalized.includes('frontier_state_cache_changes')) {
      const [snapshotKey] = params;
      const count = (this.changes.get(snapshotKey) || []).length;
      this.changes.delete(snapshotKey);
      return { rows: [], rowCount: count };
    }

    throw new Error('fake SQL connection cannot execute: ' + sql);
  }

  async transaction(callback) {
    const snapshots = new Map(this.snapshots);
    const changes = new Map(Array.from(this.changes, ([key, entries]) => [key, entries.map((entry) => ({ ...entry }))]));
    try {
      return await callback(this);
    } catch (error) {
      this.snapshots = snapshots;
      this.changes = changes;
      throw error;
    }
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

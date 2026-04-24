import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { migrations, type Migration } from './migrations.js';

export type NookDb = Database.Database;

export interface OpenDbOptions {
  file: string;
}

export interface DbStatus {
  file: string;
  applied: Array<{ id: number; name: string; appliedAt: number }>;
  pending: number;
}

export function openDb({ file }: OpenDbOptions): NookDb {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db, migrations);
  return db;
}

export function getDbStatus(db: NookDb, file: string): DbStatus {
  const rows = db
    .prepare('SELECT id, name, applied_at AS appliedAt FROM _migrations ORDER BY id')
    .all() as Array<{ id: number; name: string; appliedAt: number }>;
  const appliedIds = new Set(rows.map((r) => r.id));
  const pending = migrations.filter((m) => !appliedIds.has(m.id)).length;
  return { file, applied: rows, pending };
}

function runMigrations(db: NookDb, list: Migration[]): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )`,
  );
  const applied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as Array<{ id: number }>).map(
      (r) => r.id,
    ),
  );
  const insert = db.prepare(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
  );
  for (const m of list) {
    if (applied.has(m.id)) continue;
    const tx = db.transaction(() => {
      db.exec(m.up);
      insert.run(m.id, m.name, Date.now());
    });
    tx();
  }
}

export { migrations } from './migrations.js';
export {
  createSpace,
  deleteSpace,
  listSpaces,
  renameSpace,
  reorderSpaces,
} from './repos/spaces.js';
export {
  createCard,
  deleteCard,
  listCardsBySpace,
  updateCardData,
  updateCardTitle,
  type CreateCardInput,
} from './repos/cards.js';
export { getLayout, setLayout } from './repos/layouts.js';
export { getSettings, setSettings } from './repos/settings.js';

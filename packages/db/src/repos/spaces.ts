import { randomUUID } from 'node:crypto';
import type { Space } from '@nook/contracts';
import type { NookDb } from '../index.js';

interface SpaceRow {
  id: string;
  name: string;
  order_index: number;
  created_at: number;
  updated_at: number;
}

const toSpace = (r: SpaceRow): Space => ({
  id: r.id,
  name: r.name,
  orderIndex: r.order_index,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function listSpaces(db: NookDb): Space[] {
  const rows = db
    .prepare('SELECT * FROM spaces ORDER BY order_index ASC, created_at ASC')
    .all() as SpaceRow[];
  return rows.map(toSpace);
}

export function createSpace(db: NookDb, name: string): Space {
  const id = randomUUID();
  const now = Date.now();
  const { next } = db
    .prepare('SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM spaces')
    .get() as { next: number };
  db.prepare(
    'INSERT INTO spaces (id, name, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, name, next, now, now);
  return { id, name, orderIndex: next, createdAt: now, updatedAt: now };
}

export function renameSpace(db: NookDb, id: string, name: string): void {
  db.prepare('UPDATE spaces SET name = ?, updated_at = ? WHERE id = ?').run(
    name,
    Date.now(),
    id,
  );
}

export function deleteSpace(db: NookDb, id: string): void {
  db.prepare('DELETE FROM spaces WHERE id = ?').run(id);
}

export function reorderSpaces(db: NookDb, orderedIds: string[]): void {
  const stmt = db.prepare(
    'UPDATE spaces SET order_index = ?, updated_at = ? WHERE id = ?',
  );
  const now = Date.now();
  const tx = db.transaction(() => {
    orderedIds.forEach((id, i) => stmt.run(i, now, id));
  });
  tx();
}

import { randomUUID } from 'node:crypto';
import type { Card, CardType } from '@nook/contracts';
import type { NookDb } from '../index.js';

interface CardRow {
  id: string;
  space_id: string;
  type: string;
  title: string | null;
  data: string;
  created_at: number;
  updated_at: number;
}

const toCard = (r: CardRow): Card => ({
  id: r.id,
  spaceId: r.space_id,
  type: r.type as CardType,
  title: r.title ?? '',
  data: JSON.parse(r.data) as unknown,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function listCardsBySpace(db: NookDb, spaceId: string): Card[] {
  const rows = db
    .prepare(
      'SELECT id, space_id, type, title, data, created_at, updated_at FROM cards WHERE space_id = ? ORDER BY created_at ASC',
    )
    .all(spaceId) as CardRow[];
  return rows.map(toCard);
}

export interface CreateCardInput {
  spaceId: string;
  type: CardType;
  title: string;
  data: unknown;
}

export function createCard(db: NookDb, input: CreateCardInput): Card {
  const id = randomUUID();
  const now = Date.now();
  const dataJson = JSON.stringify(input.data ?? {});
  db.prepare(
    'INSERT INTO cards (id, space_id, type, title, data, layout, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, input.spaceId, input.type, input.title, dataJson, '{}', now, now);
  return {
    id,
    spaceId: input.spaceId,
    type: input.type,
    title: input.title,
    data: input.data,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCardTitle(db: NookDb, id: string, title: string): void {
  db.prepare('UPDATE cards SET title = ?, updated_at = ? WHERE id = ?').run(
    title,
    Date.now(),
    id,
  );
}

export function updateCardData(db: NookDb, id: string, data: unknown): void {
  db.prepare('UPDATE cards SET data = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(data ?? {}),
    Date.now(),
    id,
  );
}

export function deleteCard(db: NookDb, id: string): void {
  db.prepare('DELETE FROM cards WHERE id = ?').run(id);
}

import type { NookDb } from '../index.js';

interface LayoutRow {
  layout: string;
}

export function getLayout(db: NookDb, spaceId: string): string | null {
  const row = db
    .prepare('SELECT layout FROM space_layouts WHERE space_id = ?')
    .get(spaceId) as LayoutRow | undefined;
  return row?.layout ?? null;
}

export function setLayout(db: NookDb, spaceId: string, layout: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO space_layouts (space_id, layout, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(space_id) DO UPDATE SET layout = excluded.layout, updated_at = excluded.updated_at`,
  ).run(spaceId, layout, now);
}

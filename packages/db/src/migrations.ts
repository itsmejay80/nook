export interface Migration {
  id: number;
  name: string;
  up: string;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'init',
    up: `
      CREATE TABLE spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE cards (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT,
        data TEXT NOT NULL,
        layout TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX idx_cards_space ON cards(space_id);
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    id: 2,
    name: 'space_layouts',
    up: `
      CREATE TABLE space_layouts (
        space_id TEXT PRIMARY KEY REFERENCES spaces(id) ON DELETE CASCADE,
        layout TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `,
  },
];

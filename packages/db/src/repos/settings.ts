import { DEFAULT_SETTINGS, Settings, type SetSettingsRequest } from '@nook/contracts';
import type { NookDb } from '../index.js';

const SETTINGS_KEY = 'app';

interface Row {
  value: string;
}

export function getSettings(db: NookDb): Settings {
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(SETTINGS_KEY) as Row | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  const parsed = Settings.safeParse(JSON.parse(row.value));
  if (!parsed.success) return { ...DEFAULT_SETTINGS };
  return parsed.data;
}

export function setSettings(db: NookDb, patch: SetSettingsRequest): Settings {
  const current = getSettings(db);
  const next = Settings.parse({ ...current, ...patch });
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

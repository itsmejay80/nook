import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  type FontId,
  type Settings,
  type ThemeId,
} from '@nook/contracts';

interface SettingsState {
  settings: Settings;
  ready: boolean;
  load: () => Promise<void>;
  set: (patch: Partial<Settings>) => Promise<void>;
}

const FONT_VAR: Record<FontId, string> = {
  'instrument-sans': 'var(--font-instrument-sans)',
  fraunces: 'var(--font-fraunces)',
  inter: 'var(--font-inter)',
  'jetbrains-mono': 'var(--font-jetbrains-mono)',
};

function apply(settings: Settings): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.style.setProperty('--font-body', FONT_VAR[settings.uiFont]);
  root.style.setProperty('--font-display', FONT_VAR[settings.contentFont]);
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  ready: false,

  load: async () => {
    const loaded = await window.nook.settings.get();
    apply(loaded);
    set({ settings: loaded, ready: true });
  },

  set: async (patch) => {
    const next = await window.nook.settings.set(patch);
    apply(next);
    set({ settings: next });
  },
}));

export const FONT_LABELS: Record<FontId, string> = {
  'instrument-sans': 'Instrument Sans',
  fraunces: 'Fraunces',
  inter: 'Inter',
  'jetbrains-mono': 'JetBrains Mono',
};

export const THEME_LABELS: Record<ThemeId, string> = {
  light: 'Light',
  dark: 'Dark',
};

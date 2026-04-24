import { create } from 'zustand';
import type { Space } from '@nook/contracts';

interface SpacesState {
  spaces: Space[];
  selectedId: string | null;
  ready: boolean;
  load: () => Promise<void>;
  create: (name: string) => Promise<Space>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  select: (id: string) => void;
}

export const useSpaces = create<SpacesState>((set, get) => ({
  spaces: [],
  selectedId: null,
  ready: false,

  load: async () => {
    const existing = await window.nook.spaces.list();
    if (existing.length === 0) {
      const first = await window.nook.spaces.create({ name: 'Space 1' });
      set({ spaces: [first], selectedId: first.id, ready: true });
      return;
    }
    const currentId = get().selectedId;
    const selectedId =
      currentId && existing.some((s) => s.id === currentId)
        ? currentId
        : existing[0]!.id;
    set({ spaces: existing, selectedId, ready: true });
  },

  create: async (name) => {
    const space = await window.nook.spaces.create({ name });
    set((s) => ({ spaces: [...s.spaces, space], selectedId: space.id }));
    return space;
  },

  rename: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await window.nook.spaces.rename({ id, name: trimmed });
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === id ? { ...sp, name: trimmed, updatedAt: Date.now() } : sp,
      ),
    }));
  },

  remove: async (id) => {
    await window.nook.spaces.delete({ id });
    set((s) => {
      const spaces = s.spaces.filter((sp) => sp.id !== id);
      const selectedId =
        s.selectedId === id ? (spaces[0]?.id ?? null) : s.selectedId;
      return { spaces, selectedId };
    });
  },

  select: (id) => set({ selectedId: id }),
}));

import { create } from 'zustand';
import type { Card, CardType } from '@nook/contracts';
import { defaultCardData } from '@nook/contracts';

interface CardsState {
  bySpace: Record<string, Card[]>;
  loadingSpaceIds: Set<string>;
  load: (spaceId: string) => Promise<Card[]>;
  create: (spaceId: string, type: CardType, title?: string) => Promise<Card>;
  updateTitle: (id: string, title: string) => Promise<void>;
  updateData: (id: string, data: unknown) => Promise<void>;
  remove: (id: string) => Promise<void>;
  get: (id: string) => Card | undefined;
}

const defaultTitleFor = (_type: CardType): string => '';

export const useCards = create<CardsState>((set, getState) => ({
  bySpace: {},
  loadingSpaceIds: new Set(),

  load: async (spaceId) => {
    const cards = await window.nook.cards.list({ spaceId });
    set((s) => ({ bySpace: { ...s.bySpace, [spaceId]: cards } }));
    return cards;
  },

  create: async (spaceId, type, title) => {
    const finalTitle = title ?? defaultTitleFor(type);
    const card = await window.nook.cards.create({
      spaceId,
      type,
      title: finalTitle,
      data: defaultCardData(type),
    });
    set((s) => ({
      bySpace: {
        ...s.bySpace,
        [spaceId]: [...(s.bySpace[spaceId] ?? []), card],
      },
    }));
    return card;
  },

  updateTitle: async (id, title) => {
    await window.nook.cards.updateTitle({ id, title });
    set((s) => {
      const next: Record<string, Card[]> = {};
      for (const [spaceId, cards] of Object.entries(s.bySpace)) {
        next[spaceId] = cards.map((c) =>
          c.id === id ? { ...c, title, updatedAt: Date.now() } : c,
        );
      }
      return { bySpace: next };
    });
  },

  updateData: async (id, data) => {
    await window.nook.cards.updateData({ id, data });
    set((s) => {
      const next: Record<string, Card[]> = {};
      for (const [spaceId, cards] of Object.entries(s.bySpace)) {
        next[spaceId] = cards.map((c) =>
          c.id === id ? { ...c, data, updatedAt: Date.now() } : c,
        );
      }
      return { bySpace: next };
    });
  },

  remove: async (id) => {
    await window.nook.cards.delete({ id });
    set((s) => {
      const next: Record<string, Card[]> = {};
      for (const [spaceId, cards] of Object.entries(s.bySpace)) {
        next[spaceId] = cards.filter((c) => c.id !== id);
      }
      return { bySpace: next };
    });
  },

  get: (id) => {
    for (const cards of Object.values(getState().bySpace)) {
      const found = cards.find((c) => c.id === id);
      if (found) return found;
    }
    return undefined;
  },
}));

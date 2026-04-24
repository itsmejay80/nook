import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview';
import type { Card, CardType } from '@nook/contracts';
import { useCards } from '../stores/cards.js';
import { CardShell } from './CardShell.js';

interface CanvasProps {
  spaceId: string;
}

interface PanelParams {
  cardId: string;
}

function CardPanel(props: IDockviewPanelProps<PanelParams>) {
  const { cardId } = props.params;
  const card = useCards((s) => {
    for (const cards of Object.values(s.bySpace)) {
      const found = cards.find((c) => c.id === cardId);
      if (found) return found;
    }
    return undefined;
  });

  useEffect(() => {
    if (card && card.title && card.title !== props.api.title) {
      props.api.setTitle(card.title);
    }
  }, [card, props.api]);

  if (!card) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-400">
        Card removed
      </div>
    );
  }

  return <CardShell card={card} onClose={() => props.api.close()} />;
}

const COMPONENTS = {
  note: CardPanel,
  todo: CardPanel,
  website: CardPanel,
  document: CardPanel,
  calendar: CardPanel,
} as const satisfies Record<CardType, typeof CardPanel>;

export function Canvas({ spaceId }: CanvasProps) {
  const cards = useCards((s) => s.bySpace[spaceId] ?? null);
  const load = useCards((s) => s.load);
  const remove = useCards((s) => s.remove);
  const [api, setApi] = useState<DockviewApi | null>(null);
  const restoredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cards === null) load(spaceId);
  }, [spaceId, cards, load]);

  const onReady = useCallback(
    async (event: DockviewReadyEvent) => {
      const saved = await window.nook.layout.get({ spaceId });
      if (saved) {
        try {
          event.api.fromJSON(JSON.parse(saved));
        } catch {
          event.api.clear();
        }
      }
      restoredRef.current = true;
      setApi(event.api);
    },
    [spaceId],
  );

  useEffect(() => {
    if (!api || !restoredRef.current || cards === null) return;
    const existing = new Set(api.panels.map((p) => p.id));
    const cardIds = new Set(cards.map((c) => c.id));

    for (const card of cards) {
      if (!existing.has(card.id)) addCardPanel(api, card);
    }
    for (const panel of [...api.panels]) {
      if (!cardIds.has(panel.id)) api.removePanel(panel);
    }
  }, [api, cards]);

  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidRemovePanel((panel) => {
      if (!restoredRef.current) return;
      const current = useCards.getState().bySpace[spaceId] ?? [];
      if (current.some((c) => c.id === panel.id)) {
        remove(panel.id).catch(() => {});
      }
    });
    return () => disposable.dispose();
  }, [api, spaceId, remove]);

  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidLayoutChange(() => {
      if (!restoredRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const json = JSON.stringify(api.toJSON());
        window.nook.layout.set({ spaceId, layout: json }).catch(() => {});
      }, 400);
    });
    return () => {
      disposable.dispose();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [api, spaceId]);

  if (cards === null) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] tracking-[0.32em] text-[var(--ink-3)] uppercase">
        Loading
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--ink-3)]">
        <div className="h-px w-10 bg-[var(--line-3)]" />
        <div className="text-[10px] font-medium tracking-[0.32em] text-[var(--ink-2)] uppercase">
          Empty space
        </div>
        <div className="text-[11px] tracking-[0.08em] text-[var(--ink-4)]">
          Add a card from the sidebar
        </div>
      </div>
    );
  }

  return (
    <DockviewReact
      className="dockview-theme-light h-full w-full"
      components={COMPONENTS}
      onReady={onReady}
    />
  );
}

function addCardPanel(api: DockviewApi, card: Card): void {
  api.addPanel({
    id: card.id,
    component: card.type,
    title: card.title || card.type,
    params: { cardId: card.id } satisfies PanelParams,
  });
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
} from 'dockview';
import { Trash2 } from 'lucide-react';
import type { Card, CardType, TodoData, WebsiteData } from '@nook/contracts';
import { useCards } from '../stores/cards.js';
import { CardShell } from './CardShell.js';

const TYPE_DOT: Record<CardType, string> = {
  note: 'accent-dot-note',
  todo: 'accent-dot-todo',
  website: 'accent-dot-website',
  document: 'accent-dot-document',
  calendar: 'accent-dot-calendar',
};

const TYPE_LABEL: Record<CardType, string> = {
  note: 'Note',
  todo: 'Todo',
  website: 'Website',
  document: 'Document',
  calendar: 'Calendar',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const safeHost = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

function useCardMeta(card: Card | undefined): string {
  return useMemo(() => {
    if (!card) return '';
    switch (card.type) {
      case 'note': return fmtDate(card.updatedAt);
      case 'todo': {
        const items = Array.isArray((card.data as TodoData | undefined)?.items)
          ? (card.data as TodoData).items : [];
        return `${items.filter((i) => i.done).length}/${items.length}`;
      }
      case 'website': {
        const url = (card.data as WebsiteData | undefined)?.url;
        return url ? safeHost(url) : '';
      }
      case 'calendar': return fmtDate(card.updatedAt);
      case 'document': return '';
    }
  }, [card]);
}

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

  return <CardShell card={card} />;
}

const COMPONENTS = {
  note: CardPanel,
  todo: CardPanel,
  website: CardPanel,
  document: CardPanel,
  calendar: CardPanel,
} as const satisfies Record<CardType, typeof CardPanel>;

function CardTab(props: IDockviewPanelHeaderProps<PanelParams>) {
  const { cardId } = props.params;
  const card = useCards((s) => {
    for (const cards of Object.values(s.bySpace)) {
      const found = cards.find((c) => c.id === cardId);
      if (found) return found;
    }
    return undefined;
  });
  const updateTitle = useCards((s) => s.updateTitle);
  const remove = useCards((s) => s.remove);
  const meta = useCardMeta(card);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card?.title ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setDraft(card?.title ?? ''); }, [card?.title]);

  useEffect(() => {
    if (editing) {
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!card) return;
    if (trimmed !== card.title) await updateTitle(card.id, trimmed);
    else setDraft(card.title);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      props.api.close();
    }
  };

  if (!card) return <div className="nook-tab" />;

  const hasTitle = card.title.trim().length > 0;
  const typeLabel = TYPE_LABEL[card.type];
  const displayTitle = hasTitle ? card.title : typeLabel;
  const dotClass = TYPE_DOT[card.type];

  return (
    <div className="nook-tab group/tab" onMouseDown={onMouseDown}>
      <span className={`accent-dot ${dotClass}`} aria-hidden />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') {
              setDraft(card.title);
              setEditing(false);
            }
          }}
          placeholder={typeLabel}
          className="nook-tab-input"
        />
      ) : (
        <button
          type="button"
          className={`nook-tab-title ${hasTitle ? '' : 'nook-tab-title-empty'}`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {displayTitle}
        </button>
      )}
      <div className="nook-tab-actions" onMouseDown={(e) => e.stopPropagation()}>
        {meta && <span className="nook-tab-meta">{meta}</span>}
        <button
          type="button"
          className="nook-tab-delete"
          aria-label="Delete card"
          onClick={(e) => {
            e.stopPropagation();
            void remove(card.id);
          }}
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

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
    <div className="nook-canvas-pad h-full w-full">
      <DockviewReact
        className="dockview-theme-light h-full w-full"
        components={COMPONENTS}
        defaultTabComponent={CardTab}
        onReady={onReady}
      />
    </div>
  );
}

function addCardPanel(api: DockviewApi, card: Card): void {
  const activeGroup = api.activeGroup;
  api.addPanel({
    id: card.id,
    component: card.type,
    title: card.title || card.type,
    params: { cardId: card.id } satisfies PanelParams,
    ...(activeGroup ? { position: { referenceGroup: activeGroup, direction: 'right' } } : {}),
  });
}

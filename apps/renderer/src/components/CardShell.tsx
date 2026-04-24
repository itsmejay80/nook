import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Card, CardType } from '@nook/contracts';
import { useCards } from '../stores/cards.js';
import { CalendarCard } from '../cards/CalendarCard.js';
import { DocumentCard } from '../cards/DocumentCard.js';
import { NoteCard } from '../cards/NoteCard.js';
import { TodoCard } from '../cards/TodoCard.js';
import { WebsiteCard } from '../cards/WebsiteCard.js';

interface CardShellProps {
  card: Card;
  onClose?: () => void;
}

const TYPE_COLOR: Record<CardType, string> = {
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

export function CardShell({ card, onClose }: CardShellProps) {
  const updateTitle = useCards((s) => s.updateTitle);
  const remove = useCards((s) => s.remove);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(card.title);
  }, [card.title]);

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
    if (trimmed && trimmed !== card.title) await updateTitle(card.id, trimmed);
    else setDraft(card.title);
  };

  const handleDelete = async () => {
    await remove(card.id);
    onClose?.();
  };

  return (
    <div className="group/card flex h-full w-full flex-col bg-[var(--card)]">
      <div className="relative flex h-11 shrink-0 items-center gap-4 border-b border-[var(--line)] px-5">
        <span className={`h-1.5 w-1.5 shrink-0 ${TYPE_COLOR[card.type]}`} aria-hidden />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(card.title);
                setEditing(false);
              }
            }}
            className="font-display flex-1 bg-transparent text-[17px] font-medium tracking-[-0.015em] text-[var(--ink)] outline-none"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            onClick={() => setEditing(true)}
            className="font-display flex-1 truncate text-left text-[17px] font-medium tracking-[-0.015em] text-[var(--ink)]"
          >
            {card.title || TYPE_LABEL[card.type]}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className="-mr-1 p-1.5 text-[var(--ink-4)] opacity-0 transition-[opacity,background-color,color] group-hover/card:opacity-100 hover:bg-[var(--hover-strong)] hover:text-[var(--ink-2)]"
          aria-label="Delete card"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <CardBody card={card} />
      </div>
    </div>
  );
}

function CardBody({ card }: { card: Card }) {
  switch (card.type) {
    case 'note':
      return <NoteCard card={card} />;
    case 'todo':
      return <TodoCard card={card} />;
    case 'website':
      return <WebsiteCard card={card} />;
    case 'document':
      return <DocumentCard card={card} />;
    case 'calendar':
      return <CalendarCard card={card} />;
  }
}

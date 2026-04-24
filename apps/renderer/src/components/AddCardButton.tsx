import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  FileText,
  Globe,
  ListTodo,
  Plus,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import type { CardType } from '@nook/contracts';
import { useCards } from '../stores/cards.js';

interface AddCardButtonProps {
  spaceId: string | null;
  collapsed?: boolean;
}

const TYPES: Array<{ type: CardType; label: string; Icon: LucideIcon; accent: string }> = [
  { type: 'note', label: 'Note', Icon: StickyNote, accent: 'var(--accent-note)' },
  { type: 'todo', label: 'Todo', Icon: ListTodo, accent: 'var(--accent-todo)' },
  { type: 'website', label: 'Website', Icon: Globe, accent: 'var(--accent-website)' },
  { type: 'document', label: 'Document', Icon: FileText, accent: 'var(--accent-document)' },
  { type: 'calendar', label: 'Calendar', Icon: CalendarIcon, accent: 'var(--accent-calendar)' },
];

export function AddCardButton({ spaceId, collapsed = false }: AddCardButtonProps) {
  const create = useCards((s) => s.create);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !collapsed || !buttonRef.current) {
      setPortalPos(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    setPortalPos({ left: rect.right + 4, top: rect.top });
  }, [open, collapsed]);

  const handlePick = async (type: CardType) => {
    if (!spaceId) return;
    setOpen(false);
    await create(spaceId, type);
  };

  const menuItems = TYPES.map(({ type, label, Icon, accent }) => (
    <button
      key={type}
      type="button"
      onClick={() => handlePick(type)}
      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[var(--ink-2)] transition-colors hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  ));

  return (
    <div ref={rootRef} className="relative p-2">
      <button
        ref={buttonRef}
        type="button"
        disabled={!spaceId}
        onClick={() => setOpen((v) => !v)}
        aria-label="Add card"
        className="flex h-9 w-full items-center gap-3 rounded-md px-3 whitespace-nowrap text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-soft)] hover:text-[var(--ink)] disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span
          className={`min-w-0 text-left text-[13px] font-medium ${
            collapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          Add Card
        </span>
      </button>
      {open && !collapsed && (
        <div className="absolute right-2 bottom-full left-2 z-10 mb-1 overflow-hidden rounded-lg border border-[var(--line-2)] bg-[var(--card)] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.25)]">
          {menuItems}
        </div>
      )}
      {open && collapsed && portalPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: portalPos.left,
              top: portalPos.top,
              transform: 'translateY(-100%)',
            }}
            className="z-50 w-44 overflow-hidden rounded-lg border border-[var(--line-2)] bg-[var(--card)] shadow-[0_8px_24px_-16px_rgba(0,0,0,0.2)]"
          >
            {menuItems}
          </div>,
          document.body
        )}
    </div>
  );
}

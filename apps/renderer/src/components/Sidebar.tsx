import { useEffect, useRef, useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import type { Space } from '@nook/contracts';
import { useSpaces } from '../stores/spaces.js';
import { AddCardButton } from './AddCardButton.js';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const spaces = useSpaces((s) => s.spaces);
  const selectedId = useSpaces((s) => s.selectedId);
  const select = useSpaces((s) => s.select);
  const createSpace = useSpaces((s) => s.create);
  const renameSpace = useSpaces((s) => s.rename);
  const removeSpace = useSpaces((s) => s.remove);

  const [editingId, setEditingId] = useState<string | null>(null);
  const routerPath = useRouterState({ select: (s) => s.location.pathname });
  const onSettings = routerPath === '/settings';

  const handleAdd = async () => {
    if (collapsed) onToggleCollapsed();
    let maxNum = 0;
    for (const s of spaces) {
      const match = s.name.match(/^Space (\d+)$/);
      if (match) maxNum = Math.max(maxNum, Number(match[1]));
    }
    const space = await createSpace(`Space ${maxNum + 1}`);
    setEditingId(space.id);
  };

  const handleDelete = async (space: Space) => {
    if (spaces.length === 1) return;
    const ok = window.confirm(`Delete "${space.name}"? Its cards will be removed.`);
    if (!ok) return;
    await removeSpace(space.id);
  };

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--line)] bg-[var(--paper-2)] ${
        collapsed ? 'w-10' : 'w-60'
      }`}
    >
      <div
        className={`flex h-11 shrink-0 items-center ${
          collapsed ? 'justify-center' : 'justify-end pr-3'
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink)]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add space"
          className="flex h-11 w-full shrink-0 items-center justify-center border-t border-b border-[var(--line)] text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink)]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      ) : (
        <div className="flex h-11 items-center justify-between overflow-hidden border-t border-b border-[var(--line)] px-5 whitespace-nowrap">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] font-medium tracking-[0.32em] text-[var(--ink-3)] uppercase">
              Spaces
            </span>
            <span className="text-[9.5px] tracking-[0.2em] tabular-nums text-[var(--ink-4)]">
              {spaces.length.toString().padStart(2, '0')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="p-1 text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink)]"
            aria-label="Add space"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div
        inert={collapsed}
        className={`flex min-w-60 flex-1 flex-col overflow-hidden ${
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <nav className="flex flex-1 flex-col overflow-y-auto">
          {spaces.map((space, idx) => (
            <SpaceRow
              key={space.id}
              space={space}
              index={idx + 1}
              selected={space.id === selectedId}
              editing={editingId === space.id}
              canDelete={spaces.length > 1}
              onSelect={() => select(space.id)}
              onStartRename={() => setEditingId(space.id)}
              onCommitRename={async (name) => {
                if (name !== space.name) await renameSpace(space.id, name);
                setEditingId(null);
              }}
              onCancelRename={() => setEditingId(null)}
              onDelete={() => handleDelete(space)}
            />
          ))}
        </nav>
      </div>

      <AddCardButton spaceId={selectedId} collapsed={collapsed} />

      <Link
        to="/settings"
        aria-label="Settings"
        className={`grid h-11 shrink-0 grid-cols-[2.5rem_1fr] items-center overflow-hidden border-t border-[var(--line)] whitespace-nowrap transition-colors ${
          onSettings
            ? 'bg-[var(--card)] text-[var(--ink)]'
            : 'text-[var(--ink-3)] hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]'
        }`}
      >
        <span className="flex h-full w-10 items-center justify-center">
          <SettingsIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <span
          className={`min-w-0 pr-5 text-[10px] font-medium tracking-[0.32em] uppercase ${
            collapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          Settings
        </span>
      </Link>
    </aside>
  );
}

interface SpaceRowProps {
  space: Space;
  index: number;
  selected: boolean;
  editing: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

function SpaceRow({
  space,
  index,
  selected,
  editing,
  canDelete,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
}: SpaceRowProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(space.name);

  useEffect(() => {
    if (editing) {
      setDraft(space.name);
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, space.name]);

  const base =
    'group relative flex h-11 items-center gap-4 border-b border-[var(--line)] pr-3 pl-5 transition-colors duration-150';
  const tone = selected
    ? 'bg-[var(--card)] text-[var(--ink)]'
    : 'text-[var(--ink-2)] hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]';

  const indexLabel = index.toString().padStart(2, '0');

  if (editing) {
    return (
      <div className={`${base} bg-[var(--card)] text-[var(--ink)]`}>
        <span className="w-5 shrink-0 text-[9.5px] tracking-[0.2em] tabular-nums text-[var(--ink-4)]">
          {indexLabel}
        </span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommitRename(draft.trim() || space.name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename(draft.trim() || space.name);
            if (e.key === 'Escape') onCancelRename();
          }}
          className="font-display w-full bg-transparent text-[15px] tracking-[-0.01em] outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`${base} ${tone} cursor-pointer`}
      onClick={() => (selected ? onStartRename() : onSelect())}
      onDoubleClick={onStartRename}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (selected) onStartRename();
          else onSelect();
        }
        if (e.key === 'F2') onStartRename();
      }}
    >
      {selected && (
        <span className="absolute top-0 left-0 h-full w-[2px] bg-[var(--ink)]" />
      )}
      <span
        className={`w-5 shrink-0 text-[9.5px] tracking-[0.2em] tabular-nums transition-colors ${
          selected ? 'text-[var(--ink-3)]' : 'text-[var(--ink-4)]'
        }`}
      >
        {indexLabel}
      </span>
      <span className="font-display flex-1 truncate text-[15px] leading-none tracking-[-0.01em]">
        {space.name}
      </span>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="invisible p-1 text-[var(--ink-4)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink-2)] group-hover:visible"
          aria-label={`Delete ${space.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

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
      className={`relative flex h-full shrink-0 flex-col overflow-hidden bg-[var(--paper-2)] ${
        collapsed ? 'w-11' : 'w-60'
      }`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 px-2 pt-2 pb-1">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={handleAdd}
            aria-label="Add space"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="flex h-9 shrink-0 items-center justify-between pr-2 pl-5 whitespace-nowrap">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[var(--ink-3)] uppercase">
              Spaces
            </span>
            <span className="text-[10px] tabular-nums text-[var(--ink-4)]">
              {spaces.length}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-md p-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]"
              aria-label="Add space"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-md p-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      <div
        inert={collapsed}
        className={`flex min-w-60 flex-1 flex-col overflow-hidden ${
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 pt-1">
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

      <div className="shrink-0 border-t border-[var(--line)] pt-1 pb-1">
        <AddCardButton spaceId={selectedId} collapsed={collapsed} />
        <div className="px-2">
          <Link
            to="/settings"
            aria-label="Settings"
            className={`flex h-9 items-center gap-3 rounded-md px-3 transition-colors ${
              onSettings
                ? 'bg-[var(--hover-strong)] text-[var(--ink)]'
                : 'text-[var(--ink-3)] hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span
              className={`min-w-0 text-[13px] font-medium ${
                collapsed ? 'opacity-0' : 'opacity-100'
              }`}
            >
              Settings
            </span>
          </Link>
        </div>
      </div>
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
    'group relative flex h-8 items-center gap-3 rounded-md px-3 transition-colors duration-150';
  const tone = selected
    ? 'bg-[var(--hover-soft)] text-[var(--ink)] font-medium'
    : 'text-[var(--ink-2)] hover:bg-[var(--hover-soft)] hover:text-[var(--ink)]';

  const indexLabel = index.toString().padStart(2, '0');

  if (editing) {
    return (
      <div className={`${base} bg-[var(--hover-strong)] text-[var(--ink)]`}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommitRename(draft.trim() || space.name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename(draft.trim() || space.name);
            if (e.key === 'Escape') onCancelRename();
          }}
          className="w-full bg-transparent text-[13px] outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`${base} ${tone} cursor-pointer`}
      data-index={indexLabel}
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
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--ink-2)]"
        />
      )}
      <span className="flex-1 truncate text-[13px] leading-none">{space.name}</span>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="invisible rounded p-1 text-[var(--ink-4)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink-2)] group-hover:visible"
          aria-label={`Delete ${space.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

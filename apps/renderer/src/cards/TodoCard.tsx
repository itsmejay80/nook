import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Card, TodoData, TodoItem } from '@nook/contracts';
import { useCards } from '../stores/cards.js';

interface TodoCardProps {
  card: Card;
}

const parseTodoData = (raw: unknown): TodoData => {
  if (raw && typeof raw === 'object' && Array.isArray((raw as TodoData).items)) {
    return { items: (raw as TodoData).items };
  }
  return { items: [] };
};

const makeId = () => Math.random().toString(36).slice(2, 10);

export function TodoCard({ card }: TodoCardProps) {
  const updateData = useCards((s) => s.updateData);
  const initial = useMemo(() => parseTodoData(card.data), [card.id]);
  const [items, setItems] = useState<TodoItem[]>(initial.items);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = (next: TodoItem[]) => {
    setItems(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateData(card.id, { items: next } satisfies TodoData).catch(() => {});
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const ordered = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items],
  );

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    const nextOrder = ordered.length === 0 ? 0 : ordered[ordered.length - 1]!.order + 1;
    const item: TodoItem = { id: makeId(), text, done: false, order: nextOrder };
    setDraft('');
    persist([...items, item]);
  };

  const toggle = (id: string) => {
    persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  };

  const remove = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  const editText = (id: string, text: string) => {
    persist(items.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const moveTo = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const current = [...ordered];
    const srcIdx = current.findIndex((i) => i.id === sourceId);
    const tgtIdx = current.findIndex((i) => i.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = current.splice(srcIdx, 1);
    current.splice(tgtIdx, 0, moved!);
    persist(current.map((i, idx) => ({ ...i, order: idx })));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {ordered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8">
            <div className="text-[12px] text-[var(--ink-4)]">No items yet</div>
          </div>
        ) : (
          <ul className="flex flex-col px-2 py-1">
            {ordered.map((item) => (
              <TodoRow
                key={item.id}
                item={item}
                dragging={dragId === item.id}
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                onDropOn={(sourceId) => moveTo(sourceId, item.id)}
                onToggle={() => toggle(item.id)}
                onEdit={(text) => editText(item.id, text)}
                onRemove={() => remove(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 p-2">
        <div className="group/add flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-2)] px-3 transition-[border-color,box-shadow] focus-within:border-[var(--line-3)] focus-within:bg-[var(--card)] focus-within:shadow-[0_0_0_3px_var(--hover-soft)] hover:border-[var(--line-2)]">
          <Plus
            className="h-3.5 w-3.5 shrink-0 text-[var(--ink-4)] transition-colors group-focus-within/add:text-[var(--ink-2)]"
            strokeWidth={2}
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Add a task"
            className="h-9 flex-1 bg-transparent text-[13.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]"
          />
          {draft.trim().length > 0 && (
            <button
              type="button"
              onClick={addItem}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink)]"
              aria-label="Add item"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TodoRowProps {
  item: TodoItem;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: (sourceId: string) => void;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onRemove: () => void;
}

function TodoRow({
  item,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onToggle,
  onEdit,
  onRemove,
}: TodoRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  useEffect(() => {
    if (!editing) setDraft(item.text);
  }, [item.text, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.text) onEdit(trimmed);
    else setDraft(item.text);
  };

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) onDropOn(id);
      }}
      className={`group flex items-center gap-3 rounded-lg px-3 py-1.5 ${
        dragging ? 'opacity-40' : 'hover:bg-[var(--hover-soft)]'
      }`}
    >
      <GripVertical className="h-3.5 w-3.5 cursor-grab text-[var(--ink-4)] opacity-0 transition-opacity group-hover:opacity-100" />
      <label className="relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={item.done}
          onChange={onToggle}
          className="nook-check absolute inset-0"
        />
        {item.done && (
          <Check
            className="pointer-events-none relative h-3 w-3 text-white"
            strokeWidth={3.5}
          />
        )}
      </label>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(item.text);
              setEditing(false);
            }
          }}
          className="flex-1 bg-transparent text-[13px] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 text-left text-[14px] ${
            item.done ? 'text-[var(--ink-4)] line-through' : 'text-[var(--ink)]'
          }`}
        >
          {item.text || <span className="text-[var(--ink-4)]">(empty)</span>}
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="invisible rounded-md p-1 text-[var(--ink-4)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink-2)] group-hover:visible"
        aria-label="Delete item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

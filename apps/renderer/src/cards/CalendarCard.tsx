import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Card, CalendarData, CalendarEvent, CalendarRange } from '@nook/contracts';
import { useCards } from '../stores/cards.js';

interface CalendarCardProps {
  card: Card;
}

const RANGES: { key: CalendarRange; label: string; days: number }[] = [
  { key: '1d', label: '1d', days: 1 },
  { key: '3d', label: '3d', days: 3 },
  { key: '7d', label: '7d', days: 7 },
  { key: '14d', label: '14d', days: 14 },
];

const DAY_MS = 86_400_000;
const makeId = () => Math.random().toString(36).slice(2, 10);

const parseData = (raw: unknown): CalendarData => {
  const r = (raw ?? {}) as Partial<CalendarData>;
  return {
    source: r.source ?? 'local',
    range: r.range ?? '7d',
    cachedEvents: Array.isArray(r.cachedEvents) ? (r.cachedEvents as CalendarEvent[]) : [],
  };
};

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ts: number, todayStart: number): string {
  const day = startOfDay(ts);
  const diff = Math.round((day - todayStart) / DAY_MS);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  const d = new Date(day);
  const wk = d.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
  const mo = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  return `${wk} ${mo} ${d.getDate()}`;
}

function timeLabel(ev: CalendarEvent): string {
  if (ev.allDay) return 'ALL DAY';
  const d = new Date(ev.start);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function toDateInput(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeInput(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fromDateTime(dateStr: string, timeStr: string | null): number {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  if (!timeStr) return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const [hh, mm] = timeStr.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

export function CalendarCard({ card }: CalendarCardProps) {
  const updateData = useCards((s) => s.updateData);
  const initial = useMemo(() => parseData(card.data), [card.id]);
  const [range, setRange] = useState<CalendarRange>(initial.range);
  const [events, setEvents] = useState<CalendarEvent[]>(initial.cachedEvents);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = (patch: Partial<CalendarData>) => {
    const nextRange = patch.range ?? range;
    const nextEvents = patch.cachedEvents ?? events;
    if (patch.range !== undefined) setRange(patch.range);
    if (patch.cachedEvents !== undefined) setEvents(patch.cachedEvents);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateData(card.id, {
        source: initial.source,
        range: nextRange,
        cachedEvents: nextEvents,
      } satisfies CalendarData).catch(() => {});
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const now = Date.now();
  const todayStart = startOfDay(now);
  const days = RANGES.find((r) => r.key === range)!.days;
  const windowEnd = todayStart + days * DAY_MS;

  const upcoming = events
    .filter((e) => {
      const effectiveEnd = e.end ?? e.start;
      return effectiveEnd >= now && e.start < windowEnd;
    })
    .sort((a, b) => a.start - b.start);

  const grouped = (() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of upcoming) {
      const key = startOfDay(ev.start);
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  })();

  const setEvent = (id: string, patch: Partial<CalendarEvent>) => {
    persist({
      cachedEvents: events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const removeEvent = (id: string) => {
    persist({ cachedEvents: events.filter((e) => e.id !== id) });
  };

  const addEvent = (ev: CalendarEvent) => {
    persist({ cachedEvents: [...events, ev] });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--line)] px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[var(--ink)]">
              {upcoming.length}
            </span>
            <span className="text-[10px] font-medium tracking-[0.22em] text-[var(--ink-4)] uppercase">
              upcoming
            </span>
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => persist({ range: r.key })}
                className={`px-2 py-1 text-[10px] font-medium tracking-[0.22em] uppercase transition-colors ${
                  r.key === range
                    ? 'bg-[var(--ink)] text-[var(--paper)]'
                    : 'text-[var(--ink-3)] hover:bg-[var(--hover-soft)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {grouped.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-10">
            <div className="h-px w-8 bg-[var(--line-3)]" />
            <div className="text-[10px] font-medium tracking-[0.32em] text-[var(--ink-4)] uppercase">
              No events in {range}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {grouped.map(([dayTs, dayEvents]) => (
              <section key={dayTs} className="border-b border-[var(--line)] last:border-b-0">
                <header className="bg-[var(--card-2)] px-5 py-2 text-[10px] font-medium tracking-[0.32em] text-[var(--ink-3)] uppercase">
                  {dayLabel(dayTs, todayStart)}
                </header>
                <ul className="flex flex-col">
                  {dayEvents.map((ev) => (
                    <EventRow
                      key={ev.id}
                      event={ev}
                      onChange={(patch) => setEvent(ev.id, patch)}
                      onRemove={() => removeEvent(ev.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <AddEventBar onAdd={addEvent} />
    </div>
  );
}

interface EventRowProps {
  event: CalendarEvent;
  onChange: (patch: Partial<CalendarEvent>) => void;
  onRemove: () => void;
}

function EventRow({ event, onChange, onRemove }: EventRowProps) {
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(event.title);

  useEffect(() => {
    setDraftTitle(event.title);
  }, [event.title]);

  const commitTitle = () => {
    if (draftTitle !== event.title) onChange({ title: draftTitle });
  };

  return (
    <li className="group border-t border-[var(--line)] first:border-t-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-2.5 text-left hover:bg-[var(--hover-soft)]"
      >
        <span className="w-16 shrink-0 text-[10px] font-medium tracking-[0.22em] text-[var(--ink-3)] tabular-nums uppercase">
          {timeLabel(event)}
        </span>
        <span className="flex-1 truncate text-[13px] text-[var(--ink)]">
          {event.title || <span className="text-[var(--ink-4)]">(untitled)</span>}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="invisible p-1 text-[var(--ink-4)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink-2)] group-hover:visible"
          aria-label="Delete event"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 bg-[var(--card-2)] px-5 py-3 text-[12px]">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-[0.22em] text-[var(--ink-4)] uppercase">
              Title
            </span>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTitle();
                }
              }}
              className="h-8 border-b border-[var(--line)] bg-transparent text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ink-3)]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
              <input
                type="checkbox"
                checked={event.allDay}
                onChange={(e) => onChange({ allDay: e.target.checked })}
                className="h-3.5 w-3.5 appearance-none border border-[var(--line-3)] checked:border-[var(--ink)] checked:bg-[var(--ink)]"
              />
              All day
            </label>
            <input
              type="date"
              value={toDateInput(event.start)}
              onChange={(e) => {
                if (!e.target.value) return;
                const t = event.allDay ? null : toTimeInput(event.start);
                onChange({ start: fromDateTime(e.target.value, t) });
              }}
              className="bg-transparent text-[12px] text-[var(--ink)] outline-none"
            />
            {!event.allDay && (
              <input
                type="time"
                value={toTimeInput(event.start)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onChange({
                    start: fromDateTime(toDateInput(event.start), e.target.value),
                  });
                }}
                className="bg-transparent text-[12px] text-[var(--ink)] outline-none"
              />
            )}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-[0.22em] text-[var(--ink-4)] uppercase">
              Notes
            </span>
            <textarea
              value={event.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              className="resize-none border border-[var(--line)] bg-transparent px-2 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--ink-3)]"
            />
          </label>
        </div>
      )}
    </li>
  );
}

function AddEventBar({ onAdd }: { onAdd: (ev: CalendarEvent) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [time, setTime] = useState('');

  const submit = () => {
    const t = title.trim();
    if (!t || !date) return;
    const allDay = time === '';
    onAdd({
      id: makeId(),
      title: t,
      start: fromDateTime(date, allDay ? null : time),
      end: null,
      allDay,
      notes: '',
    });
    setTitle('');
    setTime('');
  };

  return (
    <div className="shrink-0 border-t border-[var(--line)]">
      <div className="flex items-center gap-3 px-5">
        <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--ink-4)]" strokeWidth={1.75} />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add event"
          className="h-11 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 bg-transparent text-[11px] tracking-[0.04em] text-[var(--ink-3)] tabular-nums outline-none"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-8 w-16 bg-transparent text-[11px] tracking-[0.04em] text-[var(--ink-3)] tabular-nums outline-none"
        />
      </div>
    </div>
  );
}

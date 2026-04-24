import { createElement, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import type { Card, WebsiteData } from '@nook/contracts';
import { useCards } from '../stores/cards.js';

interface WebsiteCardProps {
  card: Card;
}

interface WebviewElement extends HTMLElement {
  src: string;
  getURL: () => string;
  getTitle: () => string;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  isLoading: () => boolean;
  loadURL: (url: string) => Promise<void>;
}

const parseData = (raw: unknown): WebsiteData => {
  if (raw && typeof raw === 'object') {
    const obj = raw as Partial<WebsiteData>;
    if (typeof obj.url === 'string' && obj.url) {
      return { url: obj.url, title: typeof obj.title === 'string' ? obj.title : undefined };
    }
  }
  return { url: 'https://www.google.com' };
};

const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+\.[\w.-]+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
};

export function WebsiteCard({ card }: WebsiteCardProps) {
  const updateData = useCards((s) => s.updateData);
  const data = parseData(card.data);
  const initialUrl = useRef(data.url).current;
  const [draft, setDraft] = useState(data.url);
  const [canBack, setCanBack] = useState(false);
  const [canFwd, setCanFwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const webviewRef = useRef<WebviewElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;

    const updateNav = () => {
      setCanBack(el.canGoBack());
      setCanFwd(el.canGoForward());
    };

    const onNavigated = () => {
      const current = el.getURL();
      setDraft(current);
      updateNav();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateData(card.id, {
          url: current,
          title: el.getTitle() || undefined,
        } satisfies WebsiteData).catch(() => {});
      }, 300);
    };

    const onTitle = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateData(card.id, {
          url: el.getURL(),
          title: el.getTitle() || undefined,
        } satisfies WebsiteData).catch(() => {});
      }, 300);
    };

    const onStart = () => setLoading(true);
    const onStop = () => setLoading(false);
    const onDomReady = () => updateNav();
    const onFailLoad = (e: Event) => {
      const ev = e as Event & {
        errorCode?: number;
        validatedURL?: string;
        isMainFrame?: boolean;
      };
      if (!ev.isMainFrame) return;
      if (ev.errorCode === -3) return;
      console.warn('webview load failed', ev.errorCode, ev.validatedURL);
    };

    el.addEventListener('did-navigate', onNavigated);
    el.addEventListener('did-navigate-in-page', onNavigated);
    el.addEventListener('page-title-updated', onTitle);
    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onStop);
    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('did-fail-load', onFailLoad);

    return () => {
      el.removeEventListener('did-navigate', onNavigated);
      el.removeEventListener('did-navigate-in-page', onNavigated);
      el.removeEventListener('page-title-updated', onTitle);
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onStop);
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('did-fail-load', onFailLoad);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [card.id, updateData]);

  const go = (input: string) => {
    const next = normalizeUrl(input);
    setDraft(next);
    const el = webviewRef.current;
    if (el) el.loadURL(next).catch(() => {});
  };

  const btn = (disabled: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--hover-strong)] hover:text-[var(--ink)] ${
      disabled ? 'opacity-40 pointer-events-none' : ''
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-[var(--line)] px-2">
        <button
          type="button"
          className={btn(!canBack)}
          onClick={() => webviewRef.current?.goBack()}
          aria-label="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btn(!canFwd)}
          onClick={() => webviewRef.current?.goForward()}
          aria-label="Forward"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => webviewRef.current?.reload()}
          aria-label="Reload"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <form
          className="ml-1 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            go(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="h-7 w-full rounded-md border border-[var(--line)] bg-[var(--hover-soft)] px-2 text-[12px] text-[var(--ink-2)] outline-none focus:border-[var(--line-3)] focus:bg-[var(--card)]"
          />
        </form>
      </div>
      <div className="min-h-0 flex-1 bg-[var(--card)]">
        {createElement('webview', {
          ref: webviewRef,
          src: initialUrl,
          partition: 'persist:nook-browser',
          allowpopups: 'true',
          style: { width: '100%', height: '100%', display: 'flex' },
        })}
      </div>
    </div>
  );
}

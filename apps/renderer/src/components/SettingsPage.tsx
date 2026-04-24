import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import {
  FontId,
  ThemeId,
  type Settings,
} from '@nook/contracts';
import { FONT_LABELS, THEME_LABELS, useSettings } from '../stores/settings.js';

const THEME_IDS = ThemeId.options;
const FONT_IDS = FontId.options;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--line)] px-10 py-8">
      <h2 className="mb-5 text-[10px] font-medium tracking-[0.32em] text-[var(--ink-3)] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 py-3">
      <div className="font-display pt-0.5 text-[15px] tracking-[-0.01em] text-[var(--ink)]">
        {label}
      </div>
      <div className="flex-1 max-w-sm">{children}</div>
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  labels,
  value,
  onChange,
  fontStyle,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (next: T) => void;
  fontStyle?: (id: T) => React.CSSProperties | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex h-12 items-center justify-between border px-4 text-[13px] transition-colors ${
              active
                ? 'border-[var(--ink)] bg-[var(--card)] text-[var(--ink)]'
                : 'border-[var(--line-2)] text-[var(--ink-2)] hover:border-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            <span style={fontStyle?.(id)}>{labels[id]}</span>
            {active && <span className="h-1.5 w-1.5 bg-[var(--ink)]" />}
          </button>
        );
      })}
    </div>
  );
}

const FONT_STYLE: Record<(typeof FONT_IDS)[number], React.CSSProperties> = {
  'instrument-sans': { fontFamily: 'var(--font-instrument-sans)' },
  fraunces: { fontFamily: 'var(--font-fraunces)' },
  inter: { fontFamily: 'var(--font-inter)' },
  'jetbrains-mono': { fontFamily: 'var(--font-jetbrains-mono)' },
};

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const setSettings = useSettings((s) => s.set);

  const [version, setVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    window.nook.getAppInfo().then((info) => {
      setVersion(info.version);
      setPlatform(info.platform);
    });
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings(patch).catch((err) => console.error(err));
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-[var(--line)] bg-[var(--paper-2)] px-6">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 p-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink)]"
          aria-label="Back to canvas"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-[10px] font-medium tracking-[0.32em] uppercase">Back</span>
        </button>
        <span className="font-display ml-2 text-[15px] tracking-[-0.01em] text-[var(--ink)]">
          Settings
        </span>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        <Section title="Appearance">
          <Row label="Theme">
            <OptionGrid
              options={THEME_IDS}
              labels={THEME_LABELS}
              value={settings.theme}
              onChange={(theme) => update({ theme })}
            />
          </Row>
        </Section>

        <Section title="Typography">
          <Row label="UI font">
            <OptionGrid
              options={FONT_IDS}
              labels={FONT_LABELS}
              value={settings.uiFont}
              onChange={(uiFont) => update({ uiFont })}
              fontStyle={(id) => FONT_STYLE[id]}
            />
          </Row>
          <Row label="Content font">
            <OptionGrid
              options={FONT_IDS}
              labels={FONT_LABELS}
              value={settings.contentFont}
              onChange={(contentFont) => update({ contentFont })}
              fontStyle={(id) => FONT_STYLE[id]}
            />
          </Row>
        </Section>

        <Section title="Data">
          <Row label="User data">
            <button
              type="button"
              onClick={() => window.nook.app.openDataDir()}
              className="flex h-10 items-center gap-2 border border-[var(--line-2)] px-4 text-[13px] text-[var(--ink-2)] transition-colors hover:border-[var(--ink-3)] hover:text-[var(--ink)]"
            >
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
              Open data directory
            </button>
          </Row>
        </Section>

        <Section title="About">
          <Row label="Version">
            <span className="text-[13px] tabular-nums text-[var(--ink-2)]">
              {version || '—'}
            </span>
          </Row>
          <Row label="Platform">
            <span className="text-[13px] text-[var(--ink-2)]">{platform || '—'}</span>
          </Row>
        </Section>
      </div>
    </div>
  );
}

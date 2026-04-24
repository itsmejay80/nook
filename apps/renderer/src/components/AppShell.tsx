import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar.js';
import { useSpaces } from '../stores/spaces.js';
import { useSettings } from '../stores/settings.js';

function TitleBar() {
  const [platform, setPlatform] = useState<string>('darwin');

  useEffect(() => {
    if (!window.nook) return;
    window.nook.getAppInfo().then((info) => setPlatform(info.platform));
  }, []);

  if (platform !== 'darwin') return null;

  const handleDoubleClick = async () => {
    if (!window.nook) return;
    await window.nook.window.maximize();
  };

  return (
    <div
      className="drag relative flex h-8 w-full select-none items-center justify-center border-b border-[var(--line)] bg-[var(--paper-2)]"
      onDoubleClick={handleDoubleClick}
      title="Double-click to maximize"
    >
      <span className="text-[10px] font-medium tracking-[0.32em] text-[var(--ink-2)] uppercase">
        Nook
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const spacesReady = useSpaces((s) => s.ready);
  const loadSpaces = useSpaces((s) => s.load);
  const settingsReady = useSettings((s) => s.ready);
  const loadSettings = useSettings((s) => s.load);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.nook) {
      setError('Open Nook through the Electron window — IPC is unavailable in a plain browser.');
      return;
    }
    Promise.all([loadSettings(), loadSpaces()]).catch((err) =>
      setError(err instanceof Error ? err.message : String(err)),
    );
  }, [loadSettings, loadSpaces]);

  if (error) {
    return (
      <main className="flex h-full items-center justify-center p-8">
        <pre className="max-w-xl rounded bg-red-50 p-3 text-xs text-red-700">{error}</pre>
      </main>
    );
  }

  if (!spacesReady || !settingsReady) return <main className="h-full" />;

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

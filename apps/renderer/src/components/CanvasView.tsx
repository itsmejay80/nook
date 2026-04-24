import { Canvas } from './Canvas.js';
import { useSpaces } from '../stores/spaces.js';

export function CanvasView() {
  const selected = useSpaces((s) =>
    s.spaces.find((sp) => sp.id === s.selectedId) ?? null,
  );

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--ink-3)]">
        No space selected
      </div>
    );
  }

  return <Canvas key={selected.id} spaceId={selected.id} />;
}

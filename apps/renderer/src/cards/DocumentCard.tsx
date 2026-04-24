import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Minus,
  Plus,
} from 'lucide-react';
import type { Card, DocumentData } from '@nook/contracts';
import { useCards } from '../stores/cards.js';
import { nookDataUrl } from '../lib/nookData.js';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface DocumentCardProps {
  card: Card;
}

const parseData = (raw: unknown): DocumentData | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<DocumentData>;
  if (
    typeof obj.filePath === 'string' &&
    obj.filePath.length > 0 &&
    (obj.kind === 'pdf' || obj.kind === 'image')
  ) {
    return {
      filePath: obj.filePath,
      kind: obj.kind,
      title: typeof obj.title === 'string' ? obj.title : '',
    };
  }
  return null;
};

export function DocumentCard({ card }: DocumentCardProps) {
  const updateData = useCards((s) => s.updateData);
  const data = parseData(card.data);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const importFromPath = useCallback(
    async (sourcePath: string) => {
      setImporting(true);
      setError(null);
      try {
        const imported = await window.nook.documents.import({
          spaceId: card.spaceId,
          sourcePath,
        });
        await updateData(card.id, imported satisfies DocumentData);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setImporting(false);
      }
    },
    [card.id, card.spaceId, updateData],
  );

  const handlePick = async () => {
    setImporting(true);
    setError(null);
    try {
      const imported = await window.nook.documents.pick({ spaceId: card.spaceId });
      if (imported) await updateData(card.id, imported satisfies DocumentData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const sourcePath = window.nook.documents.getPathForFile(file);
    if (!sourcePath) {
      setError('Could not resolve dropped file path.');
      return;
    }
    await importFromPath(sourcePath);
  };

  if (!data) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex h-full flex-col items-center justify-center gap-3 p-6 text-[var(--ink-3)] ${
          dragOver ? 'bg-[var(--hover-soft)]' : ''
        }`}
      >
        <FileUp className="h-8 w-8 text-[var(--ink-4)]" />
        <div className="text-center text-sm">
          <div>Drop a PDF or image here</div>
          <div className="text-xs text-[var(--ink-4)]">or</div>
        </div>
        <button
          type="button"
          onClick={handlePick}
          disabled={importing}
          className="rounded-md border border-[var(--line-2)] bg-[var(--card)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--hover-strong)] disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Choose file'}
        </button>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    );
  }

  return data.kind === 'pdf' ? (
    <PdfViewer filePath={data.filePath} />
  ) : (
    <ImageViewer filePath={data.filePath} title={data.title} />
  );
}

interface ImageViewerProps {
  filePath: string;
  title: string;
}

function ImageViewer({ filePath, title }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        left={<span className="text-xs text-[var(--ink-3)]">{title || 'Image'}</span>}
        scale={scale}
        onZoomOut={() => setScale((s) => Math.max(0.25, s - 0.1))}
        onZoomIn={() => setScale((s) => Math.min(4, s + 0.1))}
      />
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--canvas)]">
        <div className="flex min-h-full w-full items-center justify-center p-4">
          <img
            src={nookDataUrl(filePath)}
            alt={title}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            className="max-w-none transition-transform"
          />
        </div>
      </div>
    </div>
  );
}

interface PdfViewerProps {
  filePath: string;
}

function PdfViewer({ filePath }: PdfViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setDoc(null);
    const task = pdfjs.getDocument({ url: nookDataUrl(filePath) });
    task.promise
      .then((pdf) => {
        if (!cancelled) setDoc(pdf);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [filePath]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !doc) return;
    const onScroll = () => {
      const top = container.scrollTop;
      let best = 1;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const [page, el] of pageRefs.current) {
        const dist = Math.abs(el.offsetTop - top);
        if (dist < bestDist) {
          bestDist = dist;
          best = page;
        }
      }
      setCurrentPage(best);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [doc]);

  const goTo = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el && containerRef.current) {
      containerRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    }
  };

  const total = doc?.numPages ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        left={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--hover-strong)] disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-[var(--ink-3)]">
              {total === 0 ? '…' : `${currentPage} / ${total}`}
            </span>
            <button
              type="button"
              onClick={() => goTo(Math.min(total, currentPage + 1))}
              disabled={currentPage >= total}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--hover-strong)] disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        }
        scale={scale}
        onZoomOut={() => setScale((s) => Math.max(0.5, s - 0.1))}
        onZoomIn={() => setScale((s) => Math.min(3, s + 0.1))}
      />
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto bg-[var(--canvas)]"
      >
        {error ? (
          <div className="p-4 text-xs text-red-600">Failed to load PDF: {error}</div>
        ) : !doc ? (
          <div className="p-4 text-xs text-[var(--ink-4)]">Loading PDF…</div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            {Array.from({ length: doc.numPages }, (_, i) => i + 1).map((page) => (
              <PdfPage
                key={page}
                doc={doc}
                page={page}
                scale={scale}
                register={(el) => {
                  if (el) pageRefs.current.set(page, el);
                  else pageRefs.current.delete(page);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PdfPageProps {
  doc: PDFDocumentProxy;
  page: number;
  scale: number;
  register: (el: HTMLDivElement | null) => void;
}

function PdfPage({ doc, page, scale, register }: PdfPageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    register(wrapRef.current);
    return () => register(null);
  }, [register]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    (async () => {
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;
      const outputScale = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
      const task = pdfPage.render({
        canvas,
        canvasContext: ctx,
        viewport,
        transform,
      });
      renderTask = task;
      try {
        await task.promise;
      } catch {
        /* cancelled */
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, page, scale]);

  return (
    <div ref={wrapRef} className="bg-white shadow-sm">
      <canvas ref={canvasRef} />
    </div>
  );
}

interface ToolbarProps {
  left: React.ReactNode;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

function Toolbar({ left, scale, onZoomIn, onZoomOut }: ToolbarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-2">
      <div className="flex items-center">{left}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--hover-strong)]"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 text-center text-[11px] tabular-nums text-[var(--ink-3)]">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--hover-strong)]"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

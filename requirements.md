# Canvas — Product Requirements

> A local-first, spatial workboard. Cards on an auto-tiling canvas: notes, todos, browsers, documents, calendar. Inspired by Melo (melo.so). No gestures, no AI — just a clean canvas.

---

## 1. Product overview

A desktop-first app where the user's workflow lives on one spatial canvas per "Space". The user adds **cards** (note, todo, website, document, calendar) and the canvas tiles them automatically.

**Positioning:** one-time purchase, local-first, yours forever. No subscriptions. Data lives on disk.

**Primary users (MVP):** individuals who juggle notes + todos + web research + reference documents and want it all visible simultaneously instead of tab-switching.

---

## 2. Goals & non-goals

### Goals
- Fast, responsive canvas with auto-tiling when cards are added/removed.
- 5 card types at launch (see §5).
- Offline-first. Only the Website card needs the internet.
- Theme + font customization that actually changes the feel of the app (not just accent colors).
- One-time license with local data storage.

### Non-goals (explicitly out of scope)
- **Gesture controls / hand tracking / webcam input.**
- **Any AI / LLM features.** No AI chat cards, no AI-assisted editing, no voice mode, no summarization. The app is purposefully non-AI.
- Desktop pets.
- Multi-user real-time collaboration. Single-user only.
- Mobile / web versions at launch. Desktop (Electron) only.
- Cloud sync at launch. File-based local persistence only.
- Plugin / extension marketplace at launch.

---

## 3. Tech stack (confirmed)

### Language & runtime
- TypeScript
- Bun (dev), Node.js (production runtime inside Electron main)

### Frontend (renderer)
- React 19 + Vite
- Zustand — state management
- TanStack Router — file-based routing (for settings / onboarding pages)
- Tailwind CSS — styling
- **Tiptap** — rich text editor for Note cards
- **dockview** — dockable / tileable canvas (see §10)
- **lucide-react** — icons
- **pdfjs-dist** — PDF rendering for Document cards

### Desktop shell
- Electron + `electron-updater`
- `contextBridge` / `ipcRenderer` preload bridge
- **`better-sqlite3`** in main process for local DB

### Backend
- None. No server, no WebSockets. Fully local.

### Monorepo & tooling
- Turborepo + Bun workspaces
- oxlint + oxfmt
- Vitest

### Shared packages
- `packages/contracts` — shared TypeScript types + zod schemas
- `packages/ui` — shared React components

### Suggested monorepo layout
```
apps/
  desktop/           # Electron main + preload
  renderer/          # React app (Vite)
packages/
  contracts/         # zod schemas + TS types
  ui/                # shared components (Button, Card shell, Icon, etc.)
  db/                # better-sqlite3 wrapper + migrations
```

---

## 4. Core concepts

### 4.1 Space
A named container holding one canvas of cards. Users can have multiple Spaces (e.g. "Work", "Study", "Research") and switch between them via the sidebar. Each Space persists independently.

### 4.2 Canvas
The main surface. Holds N cards arranged in a tileable layout. When a card is added, the canvas reflows. Cards are resizable by dragging edges, movable by dragging headers, and closeable.

### 4.3 Card
A typed content unit on the canvas. Every card has:
- `id` (uuid)
- `type` (`note` | `todo` | `website` | `document` | `calendar`)
- `title`
- `spaceId`
- `position` / `size` (layout data — from dockview)
- `data` (type-specific JSON payload)
- `createdAt` / `updatedAt`

### 4.4 Widget
Smaller, persistent UI elements in the sidebar (Clipboard, Settings). Distinct from Cards: widgets are app-level, cards are canvas-level.

---

## 5. Card types (MVP)

Each card type has its own renderer and editor. All cards share a common chrome: header (color dot, title, pop-out, close) + body.

### 5.1 Note
Rich-text markdown note. Toolbar: **B** *I* U S ` ``` H1 H2 • 1. "
Supports headings, bold/italic/underline/strike, inline code, code blocks, lists, blockquotes. Tiptap-based. Autosaves on change.

**Data:** `{ contentJson: TiptapDoc, contentMd: string }`

### 5.2 Todo
Checklist with progress bar at the top (e.g. `0/5`). Each item: checkbox + text. Text input at bottom to add new items. Items can be reordered (drag) and deleted.

**Data:** `{ items: Array<{ id, text, done, order }> }`

### 5.3 Website
Embedded browser. Uses Electron `<webview>` tag (or `BrowserView` in main, proxied). URL bar, back/forward/reload. Card opens to a given URL and remembers it.

**Data:** `{ url: string, title?: string }`

**Constraints:** enforce `webSecurity: true`, sandbox, no nodeIntegration in the webview.

### 5.4 Document
PDF or image viewer. User drops a file in or picks one; file is copied into the Space's local data directory. Reader supports scroll, zoom, and page navigation for PDFs.

**Data:** `{ filePath: string, kind: 'pdf' | 'image', title: string }`

Uses `pdfjs-dist` for PDF rendering.

### 5.5 Calendar
Shows upcoming events. MVP: read-only list view grouped by day (`TODAY`, `TOMORROW`, `THURSDAY APR 16`, …). Tabs or filters for `1d / 3d / 7d / 14d`.

**MVP source:** local `.ics` file the user imports, or manual events stored in SQLite.
**Post-MVP:** Google Calendar OAuth, iCloud.

**Data:** `{ source: 'local' | 'ics_url' | 'gcal', cachedEvents: Event[] }`

---

## 6. UI / layout

### 6.1 Window chrome
- Frameless / custom title bar (traffic lights on macOS).
- A small centered control in the title bar (avatar or logo, as in screenshots).

### 6.2 Sidebar (left)
- **Workspace name** + sidebar collapse toggle.
- **SPACES** section with `+` to add. List of spaces, selected one highlighted.
- Spacer.
- `+ Add Card` button → opens card picker (Note / Todo / Website / Document / Calendar).
- `+ Add Widget` button → opens widget picker.
- Widgets list: Clipboard, Settings.

### 6.3 Canvas (center/right)
- Auto-tiling layout. Cards dockable / resizable.
- Drag a card header to move; drag edges to resize; `x` to close.
- Empty state: prompt to add the first card.

### 6.4 Card chrome
- Top row: color dot (by type) + title (editable on click) + pop-out icon + close icon.
- Body: type-specific.
- Focus ring on hover.

---

## 7. Themes & customization

### 7.1 Themes
Ship with ≥ 5 themes at launch:
1. **Default light** (cream/warm — like screenshot 4)
2. **Default dark**
3. **Study** (warm dark — screenshot 2)
4. **Dev** (cool dark — screenshot 3)
5. **Dark academia** (browns/serif vibe — screenshot 5)
6. **Pixel** (monospace pixelated — screenshot 6)

A theme defines: background, surface, text, accent, border, card color palette, and font families (UI + body).

### 7.2 Fonts
- Ship with ≥ 8 bundled fonts: Inter, JetBrains Mono, IBM Plex Sans, IBM Plex Serif, Playfair Display, Press Start 2P (pixel), iA Writer Quattro, Geist.
- User can pick UI font and content font independently.

### 7.3 Settings surface
Settings page (TanStack Router route) with:
- Theme picker (live preview)
- Font picker
- Data directory (location, open-in-finder button)
- Keyboard shortcuts
- About / version / check for updates

---

## 8. Data & persistence

### 8.1 Storage location
Electron's per-user data dir (`app.getPath('userData')`):
- **macOS:** `~/Library/Application Support/<AppName>/`
- **Windows:** `%APPDATA%/<AppName>/`
- **Linux:** `~/.config/<AppName>/`

Layout:
```
<data-dir>/
  db.sqlite           # SQLite DB (spaces, cards, settings)
  spaces/
    <spaceId>/
      documents/      # copied PDFs and images
      attachments/    # user uploads
  cache/              # web card favicons, thumbnails
  logs/
```

### 8.2 Schema (SQLite, sketch)
```sql
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  data JSON NOT NULL,
  layout JSON NOT NULL,  -- position/size from dockview
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX idx_cards_space ON cards(space_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL
);
```

### 8.3 Import / export
- MVP: export a Space as JSON (+ referenced files zipped).
- MVP: import Space JSON to restore.

---

## 9. Desktop integrations

- Auto-update via `electron-updater` (GitHub releases or S3 as update feed).
- Global shortcut to toggle the window (e.g. `Cmd/Ctrl + Shift + C`).
- System tray icon with basic menu (Show, Quit).
- Deep links: `yourapp://open?space=<id>&card=<id>`.
- Drag-and-drop files from Finder/Explorer onto the canvas → creates a Document card.

---

## 10. Open decisions

Items to lock before implementation starts.

1. **Tiling library:** `dockview` (best DX, close to Melo's feel) vs `react-mosaic` (simpler) vs a custom grid. **Recommend dockview.**
--> We'll use `dockview` for the MVP.
2. **Clipboard widget scope:** clipboard history (last N items, queryable) vs just "paste into a card". Recommend history — more useful.
--> We'll use the clipboard history for the MVP.
3. **Pricing / licensing model:** one-time license key validated offline? Stripe one-time checkout → license key emailed? Need to pick.
--> Later
4. **Telemetry:** opt-in anonymous error reporting (Sentry) or none at launch?
--> Later
5. **Project name:** TBD.
--> We'll use `Nook` for the project name.

---

## 11. MVP scope (phase 1)

Everything needed for a usable v0.1:

- [x] Electron shell + Vite renderer + IPC bridge
- [x] SQLite wired up with migrations
- [x] Spaces CRUD + sidebar
- [x] Canvas with dockview — add/move/resize/close cards
- [x] Note card (Tiptap)
- [x] Todo card
- [x] Website card (Electron webview)
- [x] Document card (PDF + image)
- [x] 2 themes (light + dark) + font picker
- [x] Settings page
- [ ] Packaging for macOS + Windows via `electron-builder`
- [ ] Auto-update

### Explicitly deferred to phase 2+
- Calendar card
- Additional themes (dark academia, pixel, study, dev)
- Clipboard widget
- Linear / GCal integrations
- Export / import
- Global shortcuts + tray

---

## 12. Non-functional requirements

- **Performance:** canvas with 20 cards open should scroll/resize at 60fps on an M1 / mid-tier Windows laptop.
- **Cold start:** < 2s from click to canvas ready on M1.
- **Crash recovery:** autosave every change; on restart, state is within ≤ 1 action of last state.
- **Security:** `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` on all renderers and webviews. CSP locked down in renderer HTML.
- **Accessibility:** keyboard navigation across sidebar + cards; focus indicators; respect OS reduced-motion setting.

---

## 13. Success criteria (v1.0)

- User can install, create a Space, and add ≥ 3 card types in under 3 minutes from first launch.
- Zero data loss across 100 restarts in internal testing.
- 60fps canvas interactions on an M1 with 20 cards open.
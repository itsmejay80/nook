# Nook — Project instructions

Local-first, spatial workboard desktop app. One-time purchase. No cloud, no AI, no gestures. See `requirements.md` for the full spec — treat it as source of truth.

## Stack

- **Language:** TypeScript everywhere.
- **Package manager:** Bun (workspaces). Node is only the runtime inside Electron main in production.
- **Monorepo:** Turborepo + Bun workspaces.
- **Desktop shell:** Electron + `electron-updater`. Main and preload are compiled with esbuild.
- **Renderer:** React 19 + Vite, Tailwind CSS, Zustand, TanStack Router, Tiptap, dockview, lucide-react, pdfjs-dist.
- **DB:** `better-sqlite3` in the Electron main process (never in renderer).
- **Lint/format:** oxlint + oxfmt. **Tests:** Vitest.

## Repo layout

```
apps/
  desktop/     Electron main + preload (esbuild → dist-electron/)
  renderer/    React + Vite app (Vite → dist/)
packages/
  contracts/   zod schemas, shared TS types, IPC channel names
  ui/          shared React components (Button, Card shell, Icon, …)
  db/          better-sqlite3 wrapper + migrations
```

Always put shared types and zod schemas in `packages/contracts` and import from both sides of the IPC bridge — never redefine payload shapes inline.

## IPC bridge rules

- Renderer has `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. Do not weaken these.
- All renderer → main calls go through a `contextBridge.exposeInMainWorld('nook', …)` preload API. No `ipcRenderer` in the renderer.
- Channel names live in `packages/contracts` as string-literal consts. Payloads are validated with zod on the main side before use.
- Every new IPC channel needs: channel const in contracts, zod schema for the payload, handler in main, method on the preload API, type declaration on `window.nook` in the renderer.

## Security

- `webSecurity: true`, `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` on every `BrowserWindow` and `<webview>`.
- Website cards must use `<webview>` with the same hardening; never load arbitrary URLs into the app's own window.
- CSP header locked down in renderer HTML. Vite dev server is the only dev exception.

## Persistence

- SQLite file + per-space directories live under `app.getPath('userData')`. Never write user data inside the app bundle.
- Every schema change ships a migration in `packages/db`. No silent schema drift.
- Autosave on change; crash recovery target is ≤ 1 action of data loss (see requirements §12).

## Code style

- No comments unless they explain a non-obvious *why*. Identifiers carry the *what*.
- No emojis in code or UI unless explicitly asked.
- Prefer editing existing files over creating new ones.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen. Validate at system boundaries only (user input, IPC payloads, file I/O).
- No placeholder / TODO features — leave them out rather than half-built.

## Build & run

- `bun install` at the root.
- `bun dev` runs renderer (Vite) and desktop (Electron) together.
- `bun run build` builds all workspaces via Turbo.
- `bun run typecheck` runs `tsc --noEmit` across the repo.

## Out of scope (do not build unless requirements.md changes)

Gestures, hand tracking, webcam, AI / LLM features, desktop pets, real-time collab, mobile, cloud sync, plugin marketplace.

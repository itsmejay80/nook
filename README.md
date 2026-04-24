# Nook

A local-first, spatial workboard. Cards on an auto-tiling canvas — notes, todos, websites, documents, calendar. Desktop only. No cloud. No AI. Inspired by Melo.

See [`requirements.md`](./requirements.md) for the full product spec and [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) for contributor conventions.

## Stack

- **Language:** TypeScript
- **Package manager:** Bun (workspaces)
- **Monorepo:** Turborepo
- **Desktop shell:** Electron + `electron-updater` (main and preload bundled with esbuild)
- **Renderer:** React 19, Vite, Tailwind CSS v4, Zustand, TanStack Router, Tiptap, dockview, lucide-react, pdfjs-dist
- **DB:** `better-sqlite3` in Electron main (not yet wired — phase-1 item 2)
- **Lint / format:** oxlint + oxfmt
- **Tests:** Vitest

## Repo layout

```
apps/
  desktop/      Electron main + preload, bundled to dist-electron/
    scripts/      dev.mjs (esbuild watch + waits for Vite + spawns Electron)
                  build.mjs (one-shot esbuild)
    src/
      main.ts     Electron main process
      preload.ts  contextBridge API exposed to the renderer
  renderer/     React + Vite app, built to dist/
    src/
      main.tsx    React root
      App.tsx     Uses window.nook.* IPC API
      nook-api.d.ts  Declares window.nook for TypeScript
packages/
  contracts/    Shared zod schemas + IPC channel names (source-only)
  ui/           (planned) shared React components
  db/           (planned) better-sqlite3 wrapper + migrations
```

The app's data directory (SQLite + per-space files) lives under Electron's per-user data dir (`app.getPath('userData')`) — never inside the repo.

## Prerequisites

- Node.js ≥ 20 (matches `.nvmrc`)
- Bun ≥ 1.3
- macOS, Windows, or Linux desktop with a display

## Install

```sh
bun install
```

## Develop

```sh
bun dev
```

This runs two things in parallel via Turbo:

1. `@nook/renderer` — `vite` on `http://localhost:5173`
2. `@nook/desktop` — `node scripts/dev.mjs`, which esbuild-watches `src/main.ts` + `src/preload.ts`, waits for port 5173, and spawns Electron with `VITE_DEV_SERVER_URL` set

The Electron window loads the Vite dev server and opens devtools in a detached panel. Edits to renderer code hot-reload; edits to main/preload rebuild but need an Electron restart (Ctrl+C the dev process and rerun).

## Build

```sh
bun run build          # renderer (Vite) + desktop bundle (esbuild)
bun run typecheck      # tsc --noEmit across all workspaces
```

Build outputs:

- `apps/renderer/dist/` — static renderer bundle (loaded via `file://` in production)
- `apps/desktop/dist-electron/main.cjs` + `preload.cjs` — CJS entry for Electron

## IPC bridge pattern

Every renderer → main call flows through a typed, validated bridge. The renderer never touches `ipcRenderer` directly.

1. **Declare the channel** in `packages/contracts/src/ipc.ts`:
   ```ts
   export const IpcChannels = { ping: 'nook:ping', ... } as const;
   export const PingRequest  = z.object({ message: z.string().min(1).max(256) });
   export const PingResponse = z.object({ reply: z.string(), receivedAt: z.number() });
   ```
2. **Handle it in main** (`apps/desktop/src/main.ts`):
   ```ts
   ipcMain.handle(IpcChannels.ping, (_e, raw) => {
     const payload = PingRequest.parse(raw);   // zod-validate every payload
     return { reply: `pong: ${payload.message}`, receivedAt: Date.now() };
   });
   ```
3. **Expose it in preload** (`apps/desktop/src/preload.ts`) via `contextBridge`:
   ```ts
   contextBridge.exposeInMainWorld('nook', {
     ping: (p) => ipcRenderer.invoke(IpcChannels.ping, p),
   });
   ```
4. **Type it in the renderer** (`apps/renderer/src/nook-api.d.ts`) so `window.nook.ping(...)` is fully typed.

Security defaults on every `BrowserWindow` (and, later, `<webview>`): `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`. Don't weaken these.

## Scripts reference

| Command | What it does |
|---|---|
| `bun dev` | Run renderer + desktop in watch mode |
| `bun run build` | Build all workspaces |
| `bun run typecheck` | `tsc --noEmit` across workspaces |
| `bun run lint` | oxlint |
| `bun run format` | oxfmt |
| `bun run test` | Vitest (per-workspace) |

## Project status

MVP phase-1 progress (see [`requirements.md` §11](./requirements.md)):

- [x] Electron shell + Vite renderer + IPC bridge
- [ ] SQLite wired up with migrations
- [ ] Spaces CRUD + sidebar
- [ ] Canvas with dockview — add/move/resize/close cards
- [ ] Note card (Tiptap)
- [ ] Todo card
- [ ] Website card (Electron `<webview>`)
- [ ] Document card (PDF + image)
- [ ] 2 themes (light + dark) + font picker
- [ ] Settings page
- [ ] Packaging for macOS + Windows via `electron-builder`
- [ ] Auto-update

## Out of scope

No gestures / hand tracking / webcam input. No AI / LLM features of any kind. No desktop pets. No real-time collaboration. No mobile or web builds. No cloud sync at launch.

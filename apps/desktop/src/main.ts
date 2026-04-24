import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  net,
  protocol,
  screen,
  shell,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  CreateCardRequest,
  CreateSpaceRequest,
  DeleteCardRequest,
  DeleteSpaceRequest,
  GetLayoutRequest,
  ImportDocumentRequest,
  IpcChannels,
  ListCardsRequest,
  PickDocumentRequest,
  PingRequest,
  RenameSpaceRequest,
  ReorderSpacesRequest,
  SetLayoutRequest,
  SetSettingsRequest,
  UpdateCardDataRequest,
  UpdateCardTitleRequest,
  type AppInfo,
  type Card,
  type DbStatus,
  type ImportedDocument,
  type PingResponse,
  type Settings,
  type Space,
} from '@nook/contracts';
import {
  createCard,
  createSpace,
  deleteCard,
  deleteSpace,
  getDbStatus,
  getLayout,
  getSettings,
  listCardsBySpace,
  listSpaces,
  openDb,
  renameSpace,
  reorderSpaces,
  setLayout,
  setSettings,
  updateCardData,
  updateCardTitle,
  type NookDb,
} from '@nook/db';

declare const __dirname: string;

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!DEV_SERVER_URL;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nook-data',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: false,
      corsEnabled: true,
    },
  },
]);

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.svg']);

function detectKind(extension: string): 'pdf' | 'image' | null {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (IMAGE_EXT.has(ext)) return 'image';
  return null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').slice(0, 180) || 'file';
}

function importDocumentFile(spaceId: string, sourcePath: string): ImportedDocument {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error('Source file does not exist');
  }
  const ext = path.extname(sourcePath);
  const kind = detectKind(ext);
  if (!kind) throw new Error(`Unsupported file type: ${ext || '(none)'}`);

  const spaceDir = path.join(app.getPath('userData'), 'spaces', spaceId, 'documents');
  fs.mkdirSync(spaceDir, { recursive: true });

  const baseName = sanitizeFilename(path.basename(sourcePath, ext));
  let finalName = `${baseName}${ext}`;
  let i = 1;
  while (fs.existsSync(path.join(spaceDir, finalName))) {
    finalName = `${baseName} (${i})${ext}`;
    i += 1;
  }
  const destFull = path.join(spaceDir, finalName);
  fs.copyFileSync(sourcePath, destFull);

  const rel = path.posix.join('spaces', spaceId, 'documents', finalName);
  return { filePath: rel, kind, title: path.basename(sourcePath, ext) };
}

function registerNookDataProtocol(): void {
  const userData = app.getPath('userData');
  protocol.handle('nook-data', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.host !== 'local') {
        return new Response('forbidden', { status: 403 });
      }
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const full = path.resolve(userData, rel);
      if (!full.startsWith(userData + path.sep)) {
        return new Response('forbidden', { status: 403 });
      }
      if (!fs.existsSync(full)) {
        return new Response('not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(full).toString(), { bypassCustomProtocolHandlers: true });
    } catch {
      return new Response('bad request', { status: 400 });
    }
  });
}

let db: NookDb | null = null;
let dbFile = '';

interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  x: 0,
  y: 0,
  maximized: false,
};

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<WindowState>;
    return {
      width: Math.max(400, Math.floor(parsed.width ?? DEFAULT_STATE.width)),
      height: Math.max(300, Math.floor(parsed.height ?? DEFAULT_STATE.height)),
      x: Math.floor(parsed.x ?? DEFAULT_STATE.x),
      y: Math.floor(parsed.y ?? DEFAULT_STATE.y),
      maximized: !!parsed.maximized,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveWindowState(state: WindowState): void {
  try {
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state), 'utf-8');
  } catch {
    // silently ignore write failures
  }
}

function createWindow(): BrowserWindow {
  const state = loadWindowState();
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;

  const x = state.x > 0 && state.x < sw - 100 ? state.x : Math.floor((sw - state.width) / 2);
  const y = state.y > 0 && state.y < sh - 100 ? state.y : Math.floor((sh - state.height) / 2);

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x,
    y,
    minWidth: 400,
    minHeight: 300,
    backgroundColor: '#f5f1e8',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: true,
    },
    resizable: true,
    movable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    fullscreen: false,
    hasShadow: true,
    title: 'Nook',
    icon: path.join(__dirname, '../../renderer/public/icon.png'),
    show: false,
    center: false,
    autoHideMenuBar: true,
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-attach-webview', (_event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;
    const src = params.src ?? '';
    try {
      const target = new URL(src);
      if (target.protocol !== 'https:' && target.protocol !== 'http:') {
        params.src = 'about:blank';
      }
    } catch {
      params.src = 'about:blank';
    }
  });

  registerSnapShortcuts(win);

  win.once('ready-to-show', () => {
    if (state.maximized) {
      win.maximize();
    }
    win.show();
    if (isDev) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  win.on('close', (e) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Exit', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: 'Do you want to exit Nook?',
    });
    if (choice === 1) {
      e.preventDefault();
    }
  });

  win.on('closed', () => {
    globalShortcut.unregisterAll();
  });

  const persistState = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getNormalBounds();
    saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: win.isMaximized(),
    });
  };

  win.on('resize', persistState);
  win.on('move', persistState);
  win.on('maximize', persistState);
  win.on('unmaximize', persistState);

  if (isDev && DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    const rendererIndex = app.isPackaged
      ? path.join(__dirname, '..', 'renderer-dist', 'index.html')
      : path.join(__dirname, '../../renderer/dist/index.html');
    win.loadFile(rendererIndex);
  }

  return win;
}

type SnapEdge = 'left' | 'right' | 'maximize' | 'restore';

function snapWindow(win: BrowserWindow, edge: SnapEdge): void {
  if (win.isDestroyed()) return;
  const display = screen.getDisplayMatching(win.getBounds());
  const { x, y, width, height } = display.workArea;
  const half = Math.floor(width / 2);

  if (edge === 'maximize') {
    if (win.isFullScreen()) win.setFullScreen(false);
    win.maximize();
    return;
  }
  if (win.isMaximized()) win.unmaximize();

  switch (edge) {
    case 'left':
      win.setBounds({ x, y, width: half, height });
      break;
    case 'right':
      win.setBounds({ x: x + width - half, y, width: half, height });
      break;
    case 'restore':
      win.setBounds({
        x: x + Math.floor((width - 1280) / 2),
        y: y + Math.floor((height - 800) / 2),
        width: 1280,
        height: 800,
      });
      break;
  }
}

function registerSnapShortcuts(win: BrowserWindow): void {
  const bindings: Array<[string, SnapEdge]> = [
    ['Control+Alt+Left', 'left'],
    ['Control+Alt+Right', 'right'],
    ['Control+Alt+Up', 'maximize'],
    ['Control+Alt+Down', 'restore'],
  ];
  for (const [accel, edge] of bindings) {
    globalShortcut.register(accel, () => {
      const focused = BrowserWindow.getFocusedWindow() ?? win;
      snapWindow(focused, edge);
    });
  }
}

function registerIpc(): void {
  ipcMain.handle(IpcChannels.ping, (_event, raw: unknown): PingResponse => {
    const payload = PingRequest.parse(raw);
    return {
      reply: `pong: ${payload.message}`,
      receivedAt: Date.now(),
    };
  });

  ipcMain.handle(IpcChannels.dbStatus, (): DbStatus => {
    if (!db) throw new Error('Database not initialized');
    return getDbStatus(db, dbFile);
  });

  ipcMain.handle(IpcChannels.spacesList, (): Space[] => {
    if (!db) throw new Error('Database not initialized');
    return listSpaces(db);
  });

  ipcMain.handle(IpcChannels.spacesCreate, (_event, raw: unknown): Space => {
    if (!db) throw new Error('Database not initialized');
    const { name } = CreateSpaceRequest.parse(raw);
    return createSpace(db, name);
  });

  ipcMain.handle(IpcChannels.spacesRename, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { id, name } = RenameSpaceRequest.parse(raw);
    renameSpace(db, id, name);
  });

  ipcMain.handle(IpcChannels.spacesDelete, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { id } = DeleteSpaceRequest.parse(raw);
    deleteSpace(db, id);
  });

  ipcMain.handle(IpcChannels.spacesReorder, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { orderedIds } = ReorderSpacesRequest.parse(raw);
    reorderSpaces(db, orderedIds);
  });

  ipcMain.handle(IpcChannels.cardsList, (_event, raw: unknown): Card[] => {
    if (!db) throw new Error('Database not initialized');
    const { spaceId } = ListCardsRequest.parse(raw);
    return listCardsBySpace(db, spaceId);
  });

  ipcMain.handle(IpcChannels.cardsCreate, (_event, raw: unknown): Card => {
    if (!db) throw new Error('Database not initialized');
    const { spaceId, type, title, data } = CreateCardRequest.parse(raw);
    return createCard(db, { spaceId, type, title, data });
  });

  ipcMain.handle(IpcChannels.cardsUpdateTitle, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { id, title } = UpdateCardTitleRequest.parse(raw);
    updateCardTitle(db, id, title);
  });

  ipcMain.handle(IpcChannels.cardsUpdateData, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { id, data } = UpdateCardDataRequest.parse(raw);
    updateCardData(db, id, data);
  });

  ipcMain.handle(IpcChannels.cardsDelete, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { id } = DeleteCardRequest.parse(raw);
    deleteCard(db, id);
  });

  ipcMain.handle(IpcChannels.layoutGet, (_event, raw: unknown): string | null => {
    if (!db) throw new Error('Database not initialized');
    const { spaceId } = GetLayoutRequest.parse(raw);
    return getLayout(db, spaceId);
  });

  ipcMain.handle(IpcChannels.layoutSet, (_event, raw: unknown): void => {
    if (!db) throw new Error('Database not initialized');
    const { spaceId, layout } = SetLayoutRequest.parse(raw);
    setLayout(db, spaceId, layout);
  });

  ipcMain.handle(IpcChannels.documentsImport, (_event, raw: unknown): ImportedDocument => {
    const { spaceId, sourcePath } = ImportDocumentRequest.parse(raw);
    return importDocumentFile(spaceId, sourcePath);
  });

  ipcMain.handle(
    IpcChannels.documentsPick,
    async (_event, raw: unknown): Promise<ImportedDocument | null> => {
      const { spaceId } = PickDocumentRequest.parse(raw);
      const focused = BrowserWindow.getFocusedWindow();
      const result = focused
        ? await dialog.showOpenDialog(focused, {
            title: 'Add document',
            properties: ['openFile'],
            filters: [
              { name: 'PDF or Image', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'] },
            ],
          })
        : await dialog.showOpenDialog({
            title: 'Add document',
            properties: ['openFile'],
            filters: [
              { name: 'PDF or Image', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'] },
            ],
          });
      if (result.canceled || result.filePaths.length === 0) return null;
      return importDocumentFile(spaceId, result.filePaths[0]!);
    },
  );

  ipcMain.handle(IpcChannels.appInfo, (): AppInfo => {
    const platform = process.platform;
    if (platform !== 'darwin' && platform !== 'win32' && platform !== 'linux') {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron ?? 'unknown',
      platform,
    };
  });

  ipcMain.handle(IpcChannels.windowMinimize, (): void => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) focused.minimize();
  });

  ipcMain.handle(IpcChannels.windowMaximize, (): void => {
    const focused = BrowserWindow.getFocusedWindow();
    if (!focused || focused.isDestroyed()) return;
    if (focused.isMaximized()) {
      focused.unmaximize();
    } else {
      focused.maximize();
    }
  });

  ipcMain.handle(IpcChannels.windowClose, (): void => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) focused.close();
  });

  ipcMain.handle(IpcChannels.windowIsMaximized, (): boolean => {
    const focused = BrowserWindow.getFocusedWindow();
    return focused ? focused.isMaximized() : false;
  });

  ipcMain.handle(IpcChannels.settingsGet, (): Settings => {
    if (!db) throw new Error('Database not initialized');
    return getSettings(db);
  });

  ipcMain.handle(IpcChannels.settingsSet, (_event, raw: unknown): Settings => {
    if (!db) throw new Error('Database not initialized');
    const patch = SetSettingsRequest.parse(raw);
    return setSettings(db, patch);
  });

  ipcMain.handle(IpcChannels.appOpenDataDir, (): string => {
    const dir = app.getPath('userData');
    shell.openPath(dir);
    return dir;
  });
}

app.whenReady().then(() => {
  dbFile = path.join(app.getPath('userData'), 'db.sqlite');
  db = openDb({ file: dbFile });
  registerNookDataProtocol();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (db) {
    db.close();
    db = null;
  }
});

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('will-navigate', (e, url) => {
      try {
        const target = new URL(url);
        if (target.protocol !== 'http:' && target.protocol !== 'https:') {
          e.preventDefault();
        }
      } catch {
        e.preventDefault();
      }
    });
    contents.setWindowOpenHandler(({ url }) => {
      try {
        const target = new URL(url);
        if (target.protocol === 'http:' || target.protocol === 'https:') {
          shell.openExternal(url);
        }
      } catch {
        // ignore
      }
      return { action: 'deny' };
    });
    return;
  }

  contents.on('will-navigate', (e, url) => {
    const target = new URL(url);
    const allowedDev = DEV_SERVER_URL ? new URL(DEV_SERVER_URL).origin : null;
    if (target.origin !== allowedDev && target.protocol !== 'file:') {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
});

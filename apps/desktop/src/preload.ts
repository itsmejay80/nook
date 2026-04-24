import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  IpcChannels,
  type AppInfo,
  type Card,
  type CreateCardRequest,
  type CreateSpaceRequest,
  type DbStatus,
  type DeleteCardRequest,
  type DeleteSpaceRequest,
  type GetLayoutRequest,
  type ImportDocumentRequest,
  type ImportedDocument,
  type ListCardsRequest,
  type PickDocumentRequest,
  type PingRequest,
  type PingResponse,
  type RenameSpaceRequest,
  type ReorderSpacesRequest,
  type SetLayoutRequest,
  type SetSettingsRequest,
  type Settings,
  type Space,
  type UpdateCardDataRequest,
  type UpdateCardTitleRequest,
} from '@nook/contracts';

const api = {
  ping: (payload: PingRequest): Promise<PingResponse> =>
    ipcRenderer.invoke(IpcChannels.ping, payload),
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IpcChannels.appInfo),
  getDbStatus: (): Promise<DbStatus> => ipcRenderer.invoke(IpcChannels.dbStatus),
  spaces: {
    list: (): Promise<Space[]> => ipcRenderer.invoke(IpcChannels.spacesList),
    create: (payload: CreateSpaceRequest): Promise<Space> =>
      ipcRenderer.invoke(IpcChannels.spacesCreate, payload),
    rename: (payload: RenameSpaceRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.spacesRename, payload),
    delete: (payload: DeleteSpaceRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.spacesDelete, payload),
    reorder: (payload: ReorderSpacesRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.spacesReorder, payload),
  },
  cards: {
    list: (payload: ListCardsRequest): Promise<Card[]> =>
      ipcRenderer.invoke(IpcChannels.cardsList, payload),
    create: (payload: CreateCardRequest): Promise<Card> =>
      ipcRenderer.invoke(IpcChannels.cardsCreate, payload),
    updateTitle: (payload: UpdateCardTitleRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.cardsUpdateTitle, payload),
    updateData: (payload: UpdateCardDataRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.cardsUpdateData, payload),
    delete: (payload: DeleteCardRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.cardsDelete, payload),
  },
  layout: {
    get: (payload: GetLayoutRequest): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.layoutGet, payload),
    set: (payload: SetLayoutRequest): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.layoutSet, payload),
  },
  documents: {
    import: (payload: ImportDocumentRequest): Promise<ImportedDocument> =>
      ipcRenderer.invoke(IpcChannels.documentsImport, payload),
    pick: (payload: PickDocumentRequest): Promise<ImportedDocument | null> =>
      ipcRenderer.invoke(IpcChannels.documentsPick, payload),
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IpcChannels.windowMinimize),
    maximize: (): Promise<void> => ipcRenderer.invoke(IpcChannels.windowMaximize),
    close: (): Promise<void> => ipcRenderer.invoke(IpcChannels.windowClose),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.windowIsMaximized),
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(IpcChannels.settingsGet),
    set: (payload: SetSettingsRequest): Promise<Settings> =>
      ipcRenderer.invoke(IpcChannels.settingsSet, payload),
  },
  app: {
    openDataDir: (): Promise<string> => ipcRenderer.invoke(IpcChannels.appOpenDataDir),
  },
};

contextBridge.exposeInMainWorld('nook', api);

export type NookApi = typeof api;

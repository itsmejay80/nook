import type {
  AppInfo,
  Card,
  CreateCardRequest,
  CreateSpaceRequest,
  DbStatus,
  DeleteCardRequest,
  DeleteSpaceRequest,
  GetLayoutRequest,
  ImportDocumentRequest,
  ImportedDocument,
  ListCardsRequest,
  PickDocumentRequest,
  PingRequest,
  PingResponse,
  RenameSpaceRequest,
  ReorderSpacesRequest,
  SetLayoutRequest,
  SetSettingsRequest,
  Settings,
  Space,
  UpdateCardDataRequest,
  UpdateCardTitleRequest,
} from '@nook/contracts';

export interface NookSpacesApi {
  list: () => Promise<Space[]>;
  create: (payload: CreateSpaceRequest) => Promise<Space>;
  rename: (payload: RenameSpaceRequest) => Promise<void>;
  delete: (payload: DeleteSpaceRequest) => Promise<void>;
  reorder: (payload: ReorderSpacesRequest) => Promise<void>;
}

export interface NookCardsApi {
  list: (payload: ListCardsRequest) => Promise<Card[]>;
  create: (payload: CreateCardRequest) => Promise<Card>;
  updateTitle: (payload: UpdateCardTitleRequest) => Promise<void>;
  updateData: (payload: UpdateCardDataRequest) => Promise<void>;
  delete: (payload: DeleteCardRequest) => Promise<void>;
}

export interface NookLayoutApi {
  get: (payload: GetLayoutRequest) => Promise<string | null>;
  set: (payload: SetLayoutRequest) => Promise<void>;
}

export interface NookDocumentsApi {
  import: (payload: ImportDocumentRequest) => Promise<ImportedDocument>;
  pick: (payload: PickDocumentRequest) => Promise<ImportedDocument | null>;
  getPathForFile: (file: File) => string;
}

export interface NookWindowApi {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

export interface NookSettingsApi {
  get: () => Promise<Settings>;
  set: (payload: SetSettingsRequest) => Promise<Settings>;
}

export interface NookAppApi {
  openDataDir: () => Promise<string>;
}

export interface NookApi {
  ping: (payload: PingRequest) => Promise<PingResponse>;
  getAppInfo: () => Promise<AppInfo>;
  getDbStatus: () => Promise<DbStatus>;
  spaces: NookSpacesApi;
  cards: NookCardsApi;
  layout: NookLayoutApi;
  documents: NookDocumentsApi;
  window: NookWindowApi;
  settings: NookSettingsApi;
  app: NookAppApi;
}

declare global {
  interface Window {
    nook: NookApi;
  }
}

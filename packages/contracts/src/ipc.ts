import { z } from 'zod';

export const IpcChannels = {
  ping: 'nook:ping',
  appInfo: 'nook:app-info',
  dbStatus: 'nook:db-status',
  spacesList: 'nook:spaces.list',
  spacesCreate: 'nook:spaces.create',
  spacesRename: 'nook:spaces.rename',
  spacesDelete: 'nook:spaces.delete',
  spacesReorder: 'nook:spaces.reorder',
  cardsList: 'nook:cards.list',
  cardsCreate: 'nook:cards.create',
  cardsUpdateTitle: 'nook:cards.update-title',
  cardsUpdateData: 'nook:cards.update-data',
  cardsDelete: 'nook:cards.delete',
  layoutGet: 'nook:layout.get',
  layoutSet: 'nook:layout.set',
  documentsImport: 'nook:documents.import',
  documentsPick: 'nook:documents.pick',
  windowMinimize: 'nook:window.minimize',
  windowMaximize: 'nook:window.maximize',
  windowClose: 'nook:window.close',
  windowIsMaximized: 'nook:window.is-maximized',
  settingsGet: 'nook:settings.get',
  settingsSet: 'nook:settings.set',
  appOpenDataDir: 'nook:app.open-data-dir',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export const PingRequest = z.object({ message: z.string().min(1).max(256) });
export type PingRequest = z.infer<typeof PingRequest>;

export const PingResponse = z.object({
  reply: z.string(),
  receivedAt: z.number().int().nonnegative(),
});
export type PingResponse = z.infer<typeof PingResponse>;

export const AppInfo = z.object({
  name: z.string(),
  version: z.string(),
  electron: z.string(),
  platform: z.enum(['darwin', 'win32', 'linux']),
});
export type AppInfo = z.infer<typeof AppInfo>;

export const Space = z.object({
  id: z.string(),
  name: z.string(),
  orderIndex: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type Space = z.infer<typeof Space>;

export const CreateSpaceRequest = z.object({
  name: z.string().min(1).max(120),
});
export type CreateSpaceRequest = z.infer<typeof CreateSpaceRequest>;

export const RenameSpaceRequest = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
});
export type RenameSpaceRequest = z.infer<typeof RenameSpaceRequest>;

export const DeleteSpaceRequest = z.object({
  id: z.string().min(1),
});
export type DeleteSpaceRequest = z.infer<typeof DeleteSpaceRequest>;

export const ReorderSpacesRequest = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderSpacesRequest = z.infer<typeof ReorderSpacesRequest>;

export const CardType = z.enum(['note', 'todo', 'website', 'document', 'calendar']);
export type CardType = z.infer<typeof CardType>;

export const NoteData = z.object({
  contentJson: z.unknown().default({}),
  contentMd: z.string().default(''),
});
export type NoteData = z.infer<typeof NoteData>;

export const TodoItem = z.object({
  id: z.string().min(1),
  text: z.string(),
  done: z.boolean(),
  order: z.number().int().nonnegative(),
});
export type TodoItem = z.infer<typeof TodoItem>;

export const TodoData = z.object({
  items: z.array(TodoItem).default([]),
});
export type TodoData = z.infer<typeof TodoData>;

export const WebsiteData = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});
export type WebsiteData = z.infer<typeof WebsiteData>;

export const DocumentData = z.object({
  filePath: z.string().min(1),
  kind: z.enum(['pdf', 'image']),
  title: z.string(),
});
export type DocumentData = z.infer<typeof DocumentData>;

export const CalendarEvent = z.object({
  id: z.string().min(1),
  title: z.string(),
  start: z.number().int(),
  end: z.number().int().nullable().default(null),
  allDay: z.boolean().default(false),
  notes: z.string().default(''),
});
export type CalendarEvent = z.infer<typeof CalendarEvent>;

export const CalendarRange = z.enum(['1d', '3d', '7d', '14d']);
export type CalendarRange = z.infer<typeof CalendarRange>;

export const CalendarData = z.object({
  source: z.enum(['local', 'ics_url', 'gcal']).default('local'),
  range: CalendarRange.default('7d'),
  cachedEvents: z.array(CalendarEvent).default([]),
});
export type CalendarData = z.infer<typeof CalendarData>;

export const Card = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  type: CardType,
  title: z.string(),
  data: z.unknown(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type Card = z.infer<typeof Card>;

export function defaultCardData(type: CardType): unknown {
  switch (type) {
    case 'note':
      return { contentJson: {}, contentMd: '' } satisfies NoteData;
    case 'todo':
      return { items: [] } satisfies TodoData;
    case 'website':
      return { url: 'https://www.google.com' } satisfies WebsiteData;
    case 'document':
      return { filePath: '', kind: 'pdf', title: '' } satisfies DocumentData;
    case 'calendar':
      return { source: 'local', range: '7d', cachedEvents: [] } satisfies CalendarData;
  }
}

export const ListCardsRequest = z.object({ spaceId: z.string().min(1) });
export type ListCardsRequest = z.infer<typeof ListCardsRequest>;

export const CreateCardRequest = z.object({
  spaceId: z.string().min(1),
  type: CardType,
  title: z.string().max(200).default(''),
  data: z.unknown(),
});
export type CreateCardRequest = z.infer<typeof CreateCardRequest>;

export const UpdateCardTitleRequest = z.object({
  id: z.string().min(1),
  title: z.string().max(200),
});
export type UpdateCardTitleRequest = z.infer<typeof UpdateCardTitleRequest>;

export const UpdateCardDataRequest = z.object({
  id: z.string().min(1),
  data: z.unknown(),
});
export type UpdateCardDataRequest = z.infer<typeof UpdateCardDataRequest>;

export const DeleteCardRequest = z.object({ id: z.string().min(1) });
export type DeleteCardRequest = z.infer<typeof DeleteCardRequest>;

export const GetLayoutRequest = z.object({ spaceId: z.string().min(1) });
export type GetLayoutRequest = z.infer<typeof GetLayoutRequest>;

export const SetLayoutRequest = z.object({
  spaceId: z.string().min(1),
  layout: z.string().min(2).max(1_000_000),
});
export type SetLayoutRequest = z.infer<typeof SetLayoutRequest>;

export const ImportDocumentRequest = z.object({
  spaceId: z.string().min(1),
  sourcePath: z.string().min(1),
});
export type ImportDocumentRequest = z.infer<typeof ImportDocumentRequest>;

export const PickDocumentRequest = z.object({
  spaceId: z.string().min(1),
});
export type PickDocumentRequest = z.infer<typeof PickDocumentRequest>;

export const ImportedDocument = z.object({
  filePath: z.string().min(1),
  kind: z.enum(['pdf', 'image']),
  title: z.string(),
});
export type ImportedDocument = z.infer<typeof ImportedDocument>;

export const ThemeId = z.enum(['light', 'dark']);
export type ThemeId = z.infer<typeof ThemeId>;

export const FontId = z.enum([
  'instrument-sans',
  'fraunces',
  'inter',
  'jetbrains-mono',
]);
export type FontId = z.infer<typeof FontId>;

export const Settings = z.object({
  theme: ThemeId.default('light'),
  uiFont: FontId.default('instrument-sans'),
  contentFont: FontId.default('fraunces'),
});
export type Settings = z.infer<typeof Settings>;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  uiFont: 'instrument-sans',
  contentFont: 'fraunces',
};

export const SetSettingsRequest = Settings.partial();
export type SetSettingsRequest = z.infer<typeof SetSettingsRequest>;

export const DbStatus = z.object({
  file: z.string(),
  applied: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      name: z.string(),
      appliedAt: z.number().int().nonnegative(),
    }),
  ),
  pending: z.number().int().nonnegative(),
});
export type DbStatus = z.infer<typeof DbStatus>;

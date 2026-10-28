export type ItemStatus = 'ready' | 'skipped';

export interface CategoryRule {
  name: string;
  extensions: string[];
}

export interface OrganizerSettings {
  categories: CategoryRule[];
}

export interface PreviewItem {
  name: string;
  extension: string;
  category: string;
  size: number;
  modifiedAt: number;
  destination: string;
  status: ItemStatus;
  reason?: string;
}

export interface PreviewResult {
  folder: string;
  items: PreviewItem[];
  foldersLeft: number;
  readyCount: number;
  skippedCount: number;
}

export interface OperationResult {
  ok: boolean;
  message: string;
  moved: number;
  skipped: number;
  errors: string[];
}

export interface OrganizerApi {
  getSettings: () => Promise<OrganizerSettings>;
  saveSettings: (settings: OrganizerSettings) => Promise<OrganizerSettings>;
  chooseFolder: () => Promise<string | null>;
  preview: () => Promise<PreviewResult>;
  organize: () => Promise<OperationResult>;
  undo: () => Promise<OperationResult>;
}
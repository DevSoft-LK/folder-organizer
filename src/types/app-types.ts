export type Page =
  | 'dashboard'
  | 'organizer'
  | 'activity'
  | 'settings';

export type FilterValue = 'all' | 'ready' | 'skipped';

export type ActivityTone = 'success' | 'info' | 'warning';

export interface ActivityEntry {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  tone: ActivityTone;
}

export interface CategoryDraft {
  name: string;
  extensionsText: string;
}

import type { OrganizerApi } from '../../shared/types';

interface WindowControlsApi {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChanged: (
    callback: (maximized: boolean) => void
  ) => () => void;
}

declare global {
  interface Window {
    organizer: OrganizerApi;
    windowControls: WindowControlsApi;
  }
}

export {};
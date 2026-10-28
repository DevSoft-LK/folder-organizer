
import { useEffect, useState } from 'react';

type WindowControlsApi = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChanged: (
    callback: (maximized: boolean) => void
  ) => () => void;
};

declare global {
  interface Window {
    windowControls: WindowControlsApi;
  }
}

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void window.windowControls
      .isMaximized()
      .then((value) => {
        if (active) setMaximized(value);
      })
      .catch(() => {
        // Keep the default state if the query fails.
      });

    unsubscribe = window.windowControls.onMaximizedChanged(
      setMaximized
    );

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <header className="titlebar">
      <div className="titlebar-brand">
        <img
          className="titlebar-logo"
          src="/icons/organizer.jpg"
          alt=""
        />
        <span>DevSoft Folder Organizer</span>
      </div>

      <div className="titlebar-controls">
        <button
          className="titlebar-button"
          type="button"
          aria-label="Minimize window"
          title="Minimize"
          onClick={() => void window.windowControls.minimize()}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 6h8" />
          </svg>
        </button>

        <button
          className="titlebar-button"
          type="button"
          aria-label={maximized ? 'Restore window' : 'Maximize window'}
          title={maximized ? 'Restore' : 'Maximize'}
          onClick={() => void window.windowControls.toggleMaximize()}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            {maximized ? (
              <path d="M4 2.5h5.5V8M8 4H2.5v5.5H8V4Z" />
            ) : (
              <rect x="2.5" y="2.5" width="7" height="7" />
            )}
          </svg>
        </button>

        <button
          className="titlebar-button titlebar-close"
          type="button"
          aria-label="Close window"
          title="Close"
          onClick={() => void window.windowControls.close()}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="m3 3 6 6M9 3 3 9" />
          </svg>
        </button>
      </div>
    </header>
  );
}

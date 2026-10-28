import { useEffect, useMemo, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import Icon from './components/ui/Icon';
import DashboardPage from './pages/DashboardPage';
import OrganizerPage from './pages/OrganizerPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';
import type {
  OperationResult,
  OrganizerSettings,
  PreviewResult,
} from '../shared/types';
import type { ActivityEntry, ActivityTone, FilterValue, Page } from './types/app-types';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [folder, setFolder] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    'Choose a folder to get started. Your files will not move until you confirm an organize run.',
  );
  const [result, setResult] = useState<OperationResult | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [settings, setSettings] = useState<OrganizerSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    let active = true;

    window.organizer
      .getSettings()
      .then((loadedSettings) => {
        if (active) setSettings(loadedSettings);
      })
      .catch((error: unknown) => {
        if (active) {
          setSettingsError(
            error instanceof Error ? error.message : String(error),
          );
        }
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const items = preview?.items ?? [];
    const query = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter = filter === 'all' || item.status === filter;
      const matchesSearch =
        !query ||
        [
          item.name,
          item.category,
          item.extension,
          item.destination,
          item.reason ?? '',
        ].some((value) => value.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [preview, filter, searchTerm]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    (preview?.items ?? [])
      .filter((item) => item.status === 'ready')
      .forEach((item) => {
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
      });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [preview]);

  function trackAction(
    title: string,
    description: string,
    tone: ActivityTone = 'info',
  ) {
    setActivities((previous) =>
      [
        {
          id: `${Date.now()}-${previous.length}`,
          title,
          description,
          timestamp: Date.now(),
          tone,
        },
        ...previous,
      ].slice(0, 30),
    );
  }

  async function saveOrganizerSettings(
    nextSettings: OrganizerSettings,
  ): Promise<void> {
    setSettingsSaving(true);
    setSettingsError('');

    try {
      const saved = await window.organizer.saveSettings(nextSettings);

      setSettings(saved);
      setPreview(null);
      setNotice(
        'Custom categories saved. Refresh the preview to apply the updated rules.',
      );

      trackAction(
        'Organizer rules updated',
        `${saved.categories.length} custom category rule(s) saved`,
        'success',
      );
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSettingsSaving(false);
    }
  }

  async function runTask(task: () => Promise<void>) {
    setBusy(true);
    setResult(null);

    try {
      await task();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      setNotice(`Something went wrong: ${message}`);
      trackAction('Action failed', message, 'warning');
    } finally {
      setBusy(false);
    }
  }

  async function chooseFolder() {
    await runTask(async () => {
      const chosen = await window.organizer.chooseFolder();

      if (!chosen) return;

      setFolder(chosen);
      setPreview(null);
      setFilter('all');
      setSearchTerm('');
      setNotice('Folder selected. Preview the files before organizing.');
      trackAction('Folder selected', chosen, 'success');
    });
  }

  async function loadPreview() {
    if (!folder) {
      setNotice('Choose a folder before previewing files.');
      return;
    }

    await runTask(async () => {
      const data = await window.organizer.preview();

      setPreview(data);
      setFolder(data.folder);
      setNotice(
        `Preview ready. ${data.readyCount} file(s) can be organized; no files have been moved.`,
      );

      trackAction(
        'Preview generated',
        `${data.readyCount} ready · ${data.skippedCount} skipped · ${data.folder}`,
        'success',
      );
    });
  }

  async function organizeFiles() {
    if (!folder || !preview || preview.readyCount === 0) return;

    await runTask(async () => {
      const operation = await window.organizer.organize();

      setResult(operation);
      setNotice(operation.message);

      trackAction(
        'Organize run completed',
        operation.message,
        operation.ok ? 'success' : 'warning',
      );

      if (operation.moved > 0) {
        const refreshed = await window.organizer.preview();
        setPreview(refreshed);
      }
    });
  }

  async function undoLastRun() {
    await runTask(async () => {
      const operation = await window.organizer.undo();

      setResult(operation);
      setNotice(operation.message);

      trackAction(
        'Undo run completed',
        operation.message,
        operation.ok ? 'success' : 'warning',
      );

      if (operation.moved > 0 && folder) {
        const refreshed = await window.organizer.preview();
        setPreview(refreshed);
      }
    });
  }

  return (
    <AppLayout
      page={page}
      onNavigate={setPage}
      readyCount={preview?.readyCount ?? 0}
    >
      <main className="page-content">
        {page === 'dashboard' && (
          <DashboardPage
            folder={folder}
            preview={preview}
            visibleItems={visibleItems}
            categoryCounts={categoryCounts}
            busy={busy}
            chooseFolder={chooseFolder}
            loadPreview={loadPreview}
            goToOrganizer={() => setPage('organizer')}
          />
        )}

        {page === 'organizer' && (
          <OrganizerPage
            folder={folder}
            preview={preview}
            visibleItems={visibleItems}
            filter={filter}
            searchTerm={searchTerm}
            busy={busy}
            chooseFolder={chooseFolder}
            loadPreview={loadPreview}
            organizeFiles={organizeFiles}
            undoLastRun={undoLastRun}
            setFilter={setFilter}
            setSearchTerm={setSearchTerm}
          />
        )}

        {page === 'activity' && <ActivityPage activities={activities} />}

        {page === 'settings' && (
          <SettingsPage
            settings={settings}
            loading={settingsLoading}
            saving={settingsSaving}
            error={settingsError}
            onSave={saveOrganizerSettings}
          />
        )}

        <div
          className={`notice-panel ${result && !result.ok ? 'notice-panel-warning' : ''}`}
          role="status"
        >
          <div className="notice-icon">
            <Icon
              name={result && !result.ok ? 'warning' : 'circleCheck'}
              size={18}
            />
          </div>

          <div className="notice-copy">
            <strong>{notice}</strong>

            {result?.errors?.length ? (
              <details className="notice-details">
                <summary>View {result.errors.length} detail(s)</summary>
                <ul>
                  {result.errors.map((error, index) => (
                    <li key={`${index}-${error}`}>{error}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          {busy ? (
            <span className="working-indicator">
              <span /> Working
            </span>
          ) : null}
        </div>
      </main>
    </AppLayout>
  );
}

export default App;
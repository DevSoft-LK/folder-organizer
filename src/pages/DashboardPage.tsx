import type { PreviewItem, PreviewResult } from '../../shared/types';
import Icon from '../components/ui/Icon';
import type { IconName } from '../components/ui/Icon';
import StatCard from '../components/dashboard/StatCard';
import FilesTable from '../components/organizer/FilesTable';
import { categoryIcon } from '../utils/formatters';

interface DashboardPageProps {
  folder: string | null;
  preview: PreviewResult | null;
  visibleItems: PreviewItem[];
  categoryCounts: [string, number][];
  busy: boolean;
  chooseFolder: () => Promise<void>;
  loadPreview: () => Promise<void>;
  goToOrganizer: () => void;
}

export default function DashboardPage({
  folder,
  preview,
  visibleItems,
  categoryCounts,
  busy,
  chooseFolder,
  loadPreview,
  goToOrganizer,
}: DashboardPageProps) {
  const stats = [
    {
      label: 'Files scanned',
      value: preview ? String(preview.items.length) : '—',
      hint: 'Files in selected folder',
      icon: 'file' as IconName,
      color: 'violet',
    },
    {
      label: 'Ready to organize',
      value: preview ? String(preview.readyCount) : '—',
      hint: 'Safe to move after confirmation',
      icon: 'circleCheck' as IconName,
      color: 'green',
    },
    {
      label: 'Skipped for safety',
      value: preview ? String(preview.skippedCount) : '—',
      hint: 'Temporary, hidden, or recent',
      icon: 'shield' as IconName,
      color: 'amber',
    },
    {
      label: 'Folders left alone',
      value: preview ? String(preview.foldersLeft) : '—',
      hint: 'Existing subfolders untouched',
      icon: 'folder' as IconName,
      color: 'blue',
    },
  ];

  const totalCategorized = categoryCounts.reduce(
    (sum, entry) => sum + entry[1],
    0,
  );

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            {new Date()
              .toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
              .toUpperCase()}
          </div>

          <h1>
            Your files. <span>Under control.</span>
          </h1>

          <p>
            A clearer workspace starts with a cleaner folder. Preview your files
            before making changes.
          </p>
        </div>

        <button
          className="btn btn-primary app-primary-btn"
          type="button"
          onClick={goToOrganizer}
        >
          Open organizer <Icon name="arrowUpRight" size={17} />
        </button>
      </div>

      <section className="folder-select-card">
        <div className="folder-select-icon">
          <Icon name="folderSearch" size={26} />
        </div>

        <div className="folder-select-copy">
          <div className="field-label">WORKING FOLDER</div>
          <div className="folder-path-text" title={folder ?? ''}>
            {folder ?? 'No folder selected yet'}
          </div>
          <p>
            {folder
              ? 'Only files directly inside this folder are scanned. Subfolders are left untouched.'
              : 'Choose any folder to preview files and decide what should be organized.'}
          </p>
        </div>

        <div className="folder-select-actions">
          <button
            className="btn btn-outline-secondary app-outline-btn"
            type="button"
            onClick={chooseFolder}
            disabled={busy}
          >
            <Icon name="folder" size={16} /> Choose folder
          </button>

          <button
            className="btn btn-primary app-primary-btn"
            type="button"
            onClick={loadPreview}
            disabled={busy || !folder}
          >
            <Icon name="scan" size={16} />{' '}
            {busy ? 'Scanning…' : 'Scan folder'}
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Folder summary">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="content-card recent-card">
          <div className="content-card-header">
            <div>
              <div className="section-eyebrow">FILE OVERVIEW</div>
              <h2>Preview snapshot</h2>
              <p>Files found in the selected folder</p>
            </div>

            <button
              className="text-action"
              type="button"
              onClick={goToOrganizer}
            >
              View all <Icon name="arrowRight" size={15} />
            </button>
          </div>

          <FilesTable
            items={visibleItems.slice(0, 5)}
            hasPreview={Boolean(preview)}
            emptyMessage="Choose a folder and scan it to see a file preview."
          />

          {preview && preview.items.length > 5 ? (
            <div className="table-bottom-link">
              <button
                className="text-action"
                type="button"
                onClick={goToOrganizer}
              >
                View all {preview.items.length} files{' '}
                <Icon name="arrowRight" size={15} />
              </button>
            </div>
          ) : null}
        </section>

        <div className="dashboard-side-column">
          <section className="content-card category-card">
            <div className="content-card-header compact-header">
              <div>
                <div className="section-eyebrow">FILE BREAKDOWN</div>
                <h2>Categories</h2>
              </div>
              <div className="subtle-icon">
                <Icon name="more" size={19} />
              </div>
            </div>

            {categoryCounts.length ? (
              <div className="category-list">
                {categoryCounts.map(([name, count]) => {
                  const percentage = totalCategorized
                    ? Math.round((count / totalCategorized) * 100)
                    : 0;

                  return (
                    <div className="category-item" key={name}>
                      <div
                        className={`category-icon category-${name.toLowerCase()}`}
                      >
                        <Icon name={categoryIcon(name)} size={16} />
                      </div>

                      <div className="category-main">
                        <div className="category-title-row">
                          <span>{name}</span>
                          <strong>{count}</strong>
                        </div>

                        <div className="category-progress">
                          <span style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="category-empty">
                <div className="category-empty-icon">
                  <Icon name="files" size={23} />
                </div>
                <strong>No scan data yet</strong>
                <p>Scan a folder to see how your files are distributed.</p>
              </div>
            )}
          </section>

          <section className="tip-card">
            <div className="tip-sparkle">
              <Icon name="sparkles" size={18} />
            </div>
            <div className="tip-title">A safer way to tidy up</div>
            <p>
              Nothing moves during preview. You stay in control of every
              organize run.
            </p>
            <div className="tip-foot">
              <Icon name="shield" size={14} /> Preview first. Move second.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

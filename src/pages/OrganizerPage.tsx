import type { PreviewItem, PreviewResult } from '../../shared/types';
import Icon from '../components/ui/Icon';
import FilesTable from '../components/organizer/FilesTable';
import FilterButton from '../components/organizer/FilterButton';
import type { FilterValue } from '../types/app-types';

interface OrganizerPageProps {
  folder: string | null;
  preview: PreviewResult | null;
  visibleItems: PreviewItem[];
  filter: FilterValue;
  searchTerm: string;
  busy: boolean;
  chooseFolder: () => Promise<void>;
  loadPreview: () => Promise<void>;
  organizeFiles: () => Promise<void>;
  undoLastRun: () => Promise<void>;
  setFilter: (value: FilterValue) => void;
  setSearchTerm: (value: string) => void;
}

export default function OrganizerPage({
  folder,
  preview,
  visibleItems,
  filter,
  searchTerm,
  busy,
  chooseFolder,
  loadPreview,
  organizeFiles,
  undoLastRun,
  setFilter,
  setSearchTerm,
}: OrganizerPageProps) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FILE MANAGEMENT</div>
          <h1>File organizer</h1>
          <p>
            Review the destination for every file before you move anything.
          </p>
        </div>

        <button
          className="btn btn-outline-secondary app-outline-btn"
          type="button"
          onClick={undoLastRun}
          disabled={busy}
        >
          <Icon name="undo" size={16} /> Undo last run
        </button>
      </div>

      <section className="organizer-folder-bar">
        <div className="folder-bar-left">
          <div className="folder-bar-icon">
            <Icon name="folder" size={21} />
          </div>
          <div className="folder-bar-text">
            <span className="field-label">SELECTED FOLDER</span>
            <strong title={folder ?? ''}>
              {folder ?? 'Choose a folder to begin'}
            </strong>
          </div>
        </div>

        <div className="folder-bar-actions">
          <button
            className="btn btn-outline-secondary app-outline-btn"
            type="button"
            onClick={chooseFolder}
            disabled={busy}
          >
            Choose folder
          </button>

          <button
            className="btn btn-primary app-primary-btn"
            type="button"
            onClick={loadPreview}
            disabled={busy || !folder}
          >
            <Icon name="refresh" size={15} />{' '}
            {busy ? 'Workingâ€¦' : 'Refresh preview'}
          </button>
        </div>
      </section>

      <section className="organizer-summary">
        <div>
          <span className="summary-icon summary-violet">
            <Icon name="file" size={18} />
          </span>
          <div>
            <span>Total files</span>
            <strong>{preview?.items.length ?? 'â€”'}</strong>
          </div>
        </div>

        <div>
          <span className="summary-icon summary-green">
            <Icon name="circleCheck" size={18} />
          </span>
          <div>
            <span>Ready to move</span>
            <strong>{preview?.readyCount ?? 'â€”'}</strong>
          </div>
        </div>

        <div>
          <span className="summary-icon summary-amber">
            <Icon name="shield" size={18} />
          </span>
          <div>
            <span>Skipped</span>
            <strong>{preview?.skippedCount ?? 'â€”'}</strong>
          </div>
        </div>

        <div>
          <span className="summary-icon summary-blue">
            <Icon name="folder" size={18} />
          </span>
          <div>
            <span>Folders untouched</span>
            <strong>{preview?.foldersLeft ?? 'â€”'}</strong>
          </div>
        </div>
      </section>

      <section className="content-card organizer-table-card">
        <div className="organizer-table-heading">
          <div>
            <div className="section-eyebrow">REVIEW BEFORE MOVING</div>
            <h2>File preview</h2>
            <p>Destination paths show where each file would go.</p>
          </div>

          <div className="organize-callout">
            <Icon name="shield" size={16} />
            <span>Preview only â€” no files moved yet</span>
          </div>
        </div>

        <div className="table-tools">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search files or categories..."
              aria-label="Search files or categories"
            />
          </div>

          <div
            className="filter-tabs"
            role="group"
            aria-label="Filter preview files"
          >
            <FilterButton
              value="all"
              current={filter}
              onSelect={setFilter}
              label={`All ${preview ? `(${preview.items.length})` : ''}`}
            />
            <FilterButton
              value="ready"
              current={filter}
              onSelect={setFilter}
              label={`Ready ${preview ? `(${preview.readyCount})` : ''}`}
            />
            <FilterButton
              value="skipped"
              current={filter}
              onSelect={setFilter}
              label={`Skipped ${preview ? `(${preview.skippedCount})` : ''}`}
            />
          </div>
        </div>

        <FilesTable
          items={visibleItems}
          hasPreview={Boolean(preview)}
          emptyMessage="Choose a folder, then select Refresh preview to list its files."
        />

        <div className="organizer-table-footer">
          <div className="table-footer-note">
            <Icon name="shield" size={16} />
            <span>
              Recent files and partial downloads are skipped automatically.
            </span>
          </div>

          <button
            className="btn btn-primary app-primary-btn organize-button"
            type="button"
            onClick={organizeFiles}
            disabled={
              busy || !folder || !preview || preview.readyCount === 0
            }
          >
            <Icon name="folder" size={16} />{' '}
            {busy
              ? 'Workingâ€¦'
              : `Organize ${
                  preview?.readyCount
                    ? `${preview.readyCount} file${preview.readyCount === 1 ? '' : 's'}`
                    : 'files'
                }`}
          </button>
        </div>
      </section>
    </>
  );
}

import { useEffect, useState } from 'react';
import type { OrganizerSettings } from '../../shared/types';
import type { CategoryDraft } from '../types/app-types';
import type { IconName } from '../components/ui/Icon';
import Icon from '../components/ui/Icon';
import { parseExtensionText } from '../utils/formatters';

interface SettingsPageProps {
  settings: OrganizerSettings | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onSave: (settings: OrganizerSettings) => Promise<void>;
}

export default function SettingsPage({
  settings,
  loading,
  saving,
  error,
  onSave,
}: SettingsPageProps) {
  const [drafts, setDrafts] = useState<CategoryDraft[]>([]);
  const [newName, setNewName] = useState('');
  const [newExtensions, setNewExtensions] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (settings) {
      setDrafts(
        settings.categories.map((category) => ({
          name: category.name,
          extensionsText: category.extensions.join(', '),
        })),
      );
    }
  }, [settings]);

  function updateDraft(
    index: number,
    field: keyof CategoryDraft,
    value: string,
  ) {
    setDrafts((previous) =>
      previous.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, [field]: value } : draft,
      ),
    );
  }

  function addCategory() {
    const name = newName.trim();

    if (!name || !newExtensions.trim()) {
      setLocalError('Enter a folder name and at least one extension.');
      return;
    }

    setDrafts((previous) => [
      ...previous,
      { name, extensionsText: newExtensions },
    ]);

    setNewName('');
    setNewExtensions('');
    setLocalError('');
  }

  async function save() {
    setLocalError('');

    const categories = drafts.map((draft) => ({
      name: draft.name.trim(),
      extensions: parseExtensionText(draft.extensionsText),
    }));

    if (
      categories.some(
        (category) => !category.name || category.extensions.length === 0,
      )
    ) {
      setLocalError(
        'Every category needs a folder name and at least one file extension.',
      );
      return;
    }

    await onSave({ categories });
  }

  const safetyRules = [
    {
      icon: 'clock' as IconName,
      title: 'Skip recently modified files',
      detail:
        'Files changed in the last 5 minutes are left untouched to reduce the risk of moving an active download.',
    },
    {
      icon: 'shield' as IconName,
      title: 'Skip hidden and system files',
      detail:
        'Hidden entries and common system files are excluded from the organizer.',
    },
    {
      icon: 'folder' as IconName,
      title: 'Do not scan subfolders',
      detail:
        'Only the selected folderâ€™s top-level files are scanned. Existing folders remain untouched.',
    },
    {
      icon: 'file' as IconName,
      title: 'Avoid overwriting duplicates',
      detail:
        'When a destination filename already exists, a numbered filename is used instead.',
    },
    {
      icon: 'undo' as IconName,
      title: 'Keep local undo history',
      detail:
        'The last organize run can be reversed using the appâ€™s undo action, when the original file can be safely restored.',
    },
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">APP CONFIGURATION</div>
          <h1>Preferences</h1>
          <p>
            Customize destination folder names and the file extensions assigned
            to each folder.
          </p>
        </div>
      </div>

      <section className="settings-intro">
        <div className="settings-intro-icon">
          <Icon name="shield" size={23} />
        </div>

        <div>
          <strong>Your rules, stored locally</strong>
          <p>
            Category settings are saved on this device and used by the preview
            and organize actions. Files are not moved when you save settings.
          </p>
        </div>

        <span className="read-only-pill editable-pill">EDITABLE</span>
      </section>

      <section className="content-card categories-settings-card custom-rules-card">
        <div className="content-card-header">
          <div>
            <div className="section-eyebrow">DESTINATION RULES</div>
            <h2>Custom folders and file types</h2>
            <p>
              Rename a folder or change which extensions belong in it. Separate
              extensions with commas.
            </p>
          </div>

          <span className="activity-count">{drafts.length} rules</span>
        </div>

        {loading ? (
          <div className="custom-rules-message">Loading saved category rulesâ€¦</div>
        ) : null}

        {!loading && !settings && error ? (
          <div className="custom-rules-error" role="alert">
            Could not load saved category rules: {error}
          </div>
        ) : null}

        {!loading && settings ? (
          <>
            <div className="custom-category-list">
              {drafts.map((draft, index) => (
                <div
                  className="custom-category-row"
                  key={`${index}-${draft.name}`}
                >
                  <div className="custom-category-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="custom-category-fields">
                    <label className="custom-field">
                      <span>Destination folder name</span>
                      <input
                        className="form-control"
                        value={draft.name}
                        maxLength={64}
                        onChange={(event) =>
                          updateDraft(index, 'name', event.target.value)
                        }
                        placeholder="e.g. Pictures"
                      />
                    </label>

                    <label className="custom-field">
                      <span>File extensions</span>
                      <input
                        className="form-control"
                        value={draft.extensionsText}
                        onChange={(event) =>
                          updateDraft(
                            index,
                            'extensionsText',
                            event.target.value,
                          )
                        }
                        placeholder="e.g. jpg, png, webp"
                      />
                      <small>Enter extensions such as .jpg, .png, .webp</small>
                    </label>
                  </div>

                  <button
                    className="btn btn-outline-danger remove-category-btn"
                    type="button"
                    onClick={() =>
                      setDrafts((previous) =>
                        previous.filter((_, draftIndex) => draftIndex !== index),
                      )
                    }
                    aria-label={`Remove ${draft.name || `category ${index + 1}`}`}
                    title="Remove category"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {drafts.length === 0 ? (
                <div className="custom-rules-message">
                  No custom rules yet. Add a category below. Unmatched files go
                  to Other.
                </div>
              ) : null}
            </div>

            <div className="add-category-panel">
              <div>
                <div className="section-eyebrow">NEW RULE</div>
                <h3>Add a custom folder</h3>
                <p>
                  Example: name it â€œDesignâ€ and assign .psd, .ai, .fig.
                </p>
              </div>

              <div className="add-category-fields">
                <label className="custom-field">
                  <span>Folder name</span>
                  <input
                    className="form-control"
                    value={newName}
                    maxLength={64}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Design"
                  />
                </label>

                <label className="custom-field">
                  <span>Extensions</span>
                  <input
                    className="form-control"
                    value={newExtensions}
                    onChange={(event) => setNewExtensions(event.target.value)}
                    placeholder="psd, ai, fig"
                  />
                </label>

                <button
                  className="btn btn-outline-secondary app-outline-btn add-category-btn"
                  type="button"
                  onClick={addCategory}
                >
                  Add category
                </button>
              </div>
            </div>

            {localError ? (
              <div className="custom-rules-error" role="alert">
                {localError}
              </div>
            ) : null}

            {error ? (
              <div className="custom-rules-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="custom-rules-footer">
              <div className="custom-rules-note">
                <Icon name="shield" size={16} />
                <span>
                  Folder names and extensions are validated before saving.
                  Duplicate extension assignments are not allowed.
                </span>
              </div>

              <button
                className="btn btn-primary app-primary-btn"
                type="button"
                onClick={() => void save()}
                disabled={saving || loading}
              >
                <Icon name="check" size={16} />{' '}
                {saving ? 'Savingâ€¦' : 'Save category rules'}
              </button>
            </div>

            <div className="other-category-note">
              <Icon name="file" size={16} />
              <span>
                Extensions that do not match a rule go into <strong>Other</strong>.
                â€œOtherâ€ is reserved and cannot be renamed here.
              </span>
            </div>
          </>
        ) : null}
      </section>

      <section className="content-card settings-card">
        <div className="content-card-header">
          <div>
            <div className="section-eyebrow">FILE HANDLING</div>
            <h2>Safety rules</h2>
            <p>
              These protections remain enabled independently of your category
              rules.
            </p>
          </div>
        </div>

        <div className="settings-list">
          {safetyRules.map((rule) => (
            <div className="settings-row" key={rule.title}>
              <div className="settings-row-icon">
                <Icon name={rule.icon} size={19} />
              </div>

              <div className="settings-row-copy">
                <strong>{rule.title}</strong>
                <p>{rule.detail}</p>
              </div>

              <span className="enabled-tag">
                <span /> Enabled
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

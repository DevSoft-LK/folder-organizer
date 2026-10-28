import type { PreviewItem } from '../../../shared/types';
import Icon from '../ui/Icon';
import { categoryIcon, formatBytes, friendlyDate } from '../../utils/formatters';

interface FilesTableProps {
  items: PreviewItem[];
  hasPreview: boolean;
  emptyMessage: string;
}

export default function FilesTable({
  items,
  hasPreview,
  emptyMessage,
}: FilesTableProps) {
  return (
    <div className="table-responsive files-table-wrap">
      <table className="table files-table align-middle mb-0">
        <thead>
          <tr>
            <th>File name</th>
            <th>Category</th>
            <th>Destination</th>
            <th>Size</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <FileRow key={`${item.name}-${item.modifiedAt}`} item={item} />
          ))}

          {items.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="table-empty">
                  <div className="table-empty-icon">
                    <Icon
                      name={hasPreview ? 'search' : 'folderSearch'}
                      size={21}
                    />
                  </div>
                  <strong>
                    {hasPreview ? 'No matching files' : 'Nothing to show yet'}
                  </strong>
                  <span>
                    {hasPreview
                      ? 'Try a different search or filter.'
                      : emptyMessage}
                  </span>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function FileRow({ item }: { item: PreviewItem }) {
  return (
    <tr>
      <td>
        <div className="file-name-cell">
          <div
            className={`file-type-icon category-${item.category.toLowerCase()}`}
          >
            <Icon name={categoryIcon(item.category)} size={17} />
          </div>

          <div className="file-name-copy">
            <strong title={item.name}>{item.name}</strong>
            <span>
              {item.extension || 'No extension'}{' '}
              <span className="metadata-dot">·</span>{' '}
              {friendlyDate(item.modifiedAt)}
            </span>
          </div>
        </div>
      </td>

      <td>
        <span className="category-chip">{item.category}</span>
      </td>

      <td>
        <span className="destination-text" title={item.destination}>
          {item.destination}
        </span>
      </td>

      <td className="size-cell">{formatBytes(item.size)}</td>

      <td>
        <div className="status-cell">
          {item.status === 'ready' ? (
            <span className="file-status file-status-ready">
              <span /> Ready
            </span>
          ) : (
            <span className="file-status file-status-skipped">
              <span /> Skipped
            </span>
          )}

          {item.reason ? (
            <span className="status-reason" title={item.reason}>
              {item.reason}
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

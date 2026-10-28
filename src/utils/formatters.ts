import type { IconName } from '../components/ui/Icon';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function friendlyDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function categoryIcon(category: string): IconName {
  switch (category.toLowerCase()) {
    case 'images':
      return 'image';
    case 'videos':
      return 'video';
    case 'audio':
      return 'music';
    case 'documents':
      return 'document';
    case 'archives':
      return 'archive';
    case 'installers':
      return 'package';
    case 'code':
      return 'code';
    default:
      return 'file';
  }
}

export function parseExtensionText(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((extension) => extension.trim().toLowerCase())
        .filter(Boolean)
        .map((extension) =>
          extension.startsWith('.') ? extension : `.${extension}`,
        ),
    ),
  ];
}


import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
} from 'electron';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CategoryRule,
  OperationResult,
  OrganizerSettings,
  PreviewItem,
  PreviewResult,
} from '../shared/types';

const SKIP_EXTENSIONS = new Set([
  '.crdownload',
  '.part',
  '.tmp',
  '.download',
]);

const SKIP_NAMES = new Set([
  'desktop.ini',
  '.ds_store',
  'thumbs.db',
]);

const MIN_AGE_MINUTES = 5;
const UNDO_LOG_NAME = 'undo-history.json';
const SETTINGS_FILE_NAME = 'organizer-settings.json';
const SPLASH_DURATION_MS = 2000;

const DEFAULT_CATEGORIES: CategoryRule[] = [
  {
    name: 'Images',
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'],
  },
  {
    name: 'Videos',
    extensions: ['.mp4', '.mkv', '.mov', '.webm', '.wmv', '.m4v'],
  },
  {
    name: 'Audio',
    extensions: ['.mp3', '.wav', '.m4a'],
  },
  {
    name: 'Documents',
    extensions: [
      '.pdf',
      '.doc',
      '.docx',
      '.txt',
      '.csv',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
    ],
  },
  {
    name: 'Archives',
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
  },
  {
    name: 'Installers',
    extensions: ['.exe', '.msi', '.msix', '.appx'],
  },
];

interface MoveRecord {
  originalPath: string;
  newPath: string;
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let selectedDirectory: string | null = null;

function getAppIconPath(): string {
  return path.join(
    app.getAppPath(),
    'assets',
    'icons',
    'organizer.ico',
  );
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Request rejected: untrusted renderer.');
  }
}

function getUndoLogPath(): string {
  return path.join(app.getPath('userData'), UNDO_LOG_NAME);
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE_NAME);
}

function validateSettings(input: unknown): OrganizerSettings {
  if (
    !input ||
    typeof input !== 'object' ||
    !Array.isArray((input as { categories?: unknown }).categories)
  ) {
    throw new Error('Invalid settings: expected a categories array.');
  }

  const inputCategories = (
    input as { categories: unknown[] }
  ).categories;

  if (inputCategories.length > 50) {
    throw new Error('You can configure at most 50 categories.');
  }

  const names = new Set<string>();
  const extensionOwners = new Map<string, string>();

  const categories: CategoryRule[] = inputCategories.map(
    (entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Category ${index + 1} is invalid.`);
      }

      const candidate = entry as {
        name?: unknown;
        extensions?: unknown;
      };

      if (
        typeof candidate.name !== 'string' ||
        !Array.isArray(candidate.extensions)
      ) {
        throw new Error(
          `Category ${index + 1} must have a name and an extensions array.`,
        );
      }

      const name = candidate.name.trim();

      if (
        !name ||
        name.length > 64 ||
        name === '.' ||
        name === '..'
      ) {
        throw new Error(
          `Category ${index + 1} needs a folder name between 1 and 64 characters.`,
        );
      }

      if (/[<>:"/\\|?*\x00-\x1F]/.test(name) || /[. ]$/.test(name)) {
        throw new Error(
          `"${name}" is not a valid Windows folder name.`,
        );
      }

      if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(name)) {
        throw new Error(
          `"${name}" is reserved by Windows and cannot be used as a folder name.`,
        );
      }

      if (name.toLowerCase() === 'other') {
        throw new Error(
          '"Other" is reserved for files that do not match any custom category.',
        );
      }

      const nameKey = name.toLocaleLowerCase();

      if (names.has(nameKey)) {
        throw new Error(
          `The folder name "${name}" is used more than once.`,
        );
      }

      names.add(nameKey);

      if (
        candidate.extensions.length === 0 ||
        candidate.extensions.length > 100
      ) {
        throw new Error(
          `Category "${name}" must contain between 1 and 100 file extensions.`,
        );
      }

      const extensionSet = new Set<string>();

      for (const rawExtension of candidate.extensions) {
        if (typeof rawExtension !== 'string') {
          throw new Error(
            `Category "${name}" contains an invalid extension.`,
          );
        }

        const trimmed = rawExtension.trim().toLowerCase();
        const extension = trimmed.startsWith('.')
          ? trimmed
          : `.${trimmed}`;

        if (!/^\.[a-z0-9][a-z0-9_-]{0,14}$/.test(extension)) {
          throw new Error(
            `"${rawExtension}" is not a valid file extension. Use values like .jpg or .psd.`,
          );
        }

        const owner = extensionOwners.get(extension);

        if (owner) {
          throw new Error(
            `The extension "${extension}" is assigned to both "${owner}" and "${name}".`,
          );
        }

        extensionOwners.set(extension, name);
        extensionSet.add(extension);
      }

      return {
        name,
        extensions: [...extensionSet],
      };
    },
  );

  return { categories };
}

async function persistSettings(
  settings: OrganizerSettings,
): Promise<void> {
  const settingsPath = getSettingsPath();

  await fs.mkdir(path.dirname(settingsPath), {
    recursive: true,
  });

  await fs.writeFile(
    settingsPath,
    JSON.stringify(settings, null, 2),
    'utf8',
  );
}

async function readSettings(): Promise<OrganizerSettings> {
  const settingsPath = getSettingsPath();
  let raw: string;

  try {
    raw = await fs.readFile(settingsPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    const defaults = validateSettings({
      categories: DEFAULT_CATEGORIES,
    });

    await persistSettings(defaults);
    return defaults;
  }

  return validateSettings(JSON.parse(raw) as unknown);
}

function categoryForExtension(
  extension: string,
  categories: CategoryRule[],
): string {
  const normalized = extension.toLowerCase();

  for (const category of categories) {
    if (category.extensions.includes(normalized)) {
      return category.name;
    }
  }

  return 'Other';
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function uniquePath(
  directory: string,
  filename: string,
): Promise<string> {
  let target = path.join(directory, filename);

  if (!(await pathExists(target))) {
    return target;
  }

  const extension = path.extname(filename);
  const base = path.basename(filename, extension);
  let index = 1;

  do {
    target = path.join(
      directory,
      `${base} (${index})${extension}`,
    );
    index += 1;
  } while (await pathExists(target));

  return target;
}

async function buildPreview(
  directory: string,
): Promise<PreviewResult> {
  const directoryStat = await fs.stat(directory);

  if (!directoryStat.isDirectory()) {
    throw new Error('The selected path is not a folder.');
  }

  const settings = await readSettings();
  const now = Date.now();

  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const items: PreviewItem[] = [];
  let foldersLeft = 0;

  for (const entry of entries) {
    const sourcePath = path.join(directory, entry.name);

    // Existing folders are intentionally left untouched.
    if (entry.isDirectory()) {
      foldersLeft += 1;
      continue;
    }

    // Do not follow symlinks or organize non-regular files.
    if (!entry.isFile()) continue;

    let stat;

    try {
      stat = await fs.stat(sourcePath);
    } catch {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    const category = categoryForExtension(
      extension,
      settings.categories,
    );

    let reason: string | undefined;

    if (
      SKIP_NAMES.has(entry.name.toLowerCase()) ||
      entry.name.startsWith('.')
    ) {
      reason = 'Hidden or system file';
    } else if (SKIP_EXTENSIONS.has(extension)) {
      reason = 'Partial or temporary download';
    } else if (
      (now - stat.mtimeMs) / 60_000 < MIN_AGE_MINUTES
    ) {
      reason = `Modified within the last ${MIN_AGE_MINUTES} minutes`;
    }

    items.push({
      name: entry.name,
      extension: extension || '(no extension)',
      category,
      size: stat.size,
      modifiedAt: stat.mtimeMs,
      destination: path.join(category, entry.name),
      status: reason ? 'skipped' : 'ready',
      ...(reason ? { reason } : {}),
    });
  }

  items.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'ready' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, {
      sensitivity: 'base',
    });
  });

  return {
    folder: directory,
    items,
    foldersLeft,
    readyCount: items.filter((item) => item.status === 'ready').length,
    skippedCount: items.filter((item) => item.status === 'skipped').length,
  };
}

async function readHistory(): Promise<MoveRecord[]> {
  try {
    const raw = await fs.readFile(getUndoLogPath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (record): record is MoveRecord =>
        !!record &&
        typeof record.originalPath === 'string' &&
        typeof record.newPath === 'string',
    );
  } catch {
    return [];
  }
}

async function saveHistory(history: MoveRecord[]): Promise<void> {
  const logPath = getUndoLogPath();

  await fs.mkdir(path.dirname(logPath), {
    recursive: true,
  });

  await fs.writeFile(
    logPath,
    JSON.stringify(history, null, 2),
    'utf8',
  );
}

async function handleOrganize(): Promise<OperationResult> {
  if (!selectedDirectory) {
    throw new Error('Choose a folder first.');
  }

  // Re-scan before moving files to avoid using a stale preview.
  const preview = await buildPreview(selectedDirectory);
  const readyItems = preview.items.filter(
    (item) => item.status === 'ready',
  );

  if (readyItems.length === 0) {
    return {
      ok: true,
      message: 'No eligible files were found. Nothing was moved.',
      moved: 0,
      skipped: preview.skippedCount,
      errors: [],
    };
  }

  const choice = await dialog.showMessageBox(mainWindow!, {
    type: 'warning',
    title: 'Confirm file organization',
    message: `Move ${readyItems.length} file(s) into category folders?`,
    detail:
      'A preview was checked again just now. Existing folders will remain untouched, duplicate names will be numbered, and files modified in the last 5 minutes are excluded.',
    buttons: ['Move files', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });

  if (choice.response !== 0) {
    return {
      ok: false,
      message: 'Move cancelled. No files were moved.',
      moved: 0,
      skipped: 0,
      errors: [],
    };
  }

  let moved = 0;
  let skipped = 0;

  const errors: string[] = [];
  const history: MoveRecord[] = [];

  for (const item of readyItems) {
    const sourcePath = path.join(selectedDirectory, item.name);
    const targetDirectory = path.join(
      selectedDirectory,
      item.category,
    );

    try {
      await fs.mkdir(targetDirectory, {
        recursive: true,
      });

      if (!(await pathExists(sourcePath))) {
        skipped += 1;
        errors.push(
          `${item.name}: the source file no longer exists.`,
        );
        continue;
      }

      const targetPath = await uniquePath(
        targetDirectory,
        item.name,
      );

      await fs.rename(sourcePath, targetPath);
      moved += 1;

      history.push({
        originalPath: sourcePath,
        newPath: targetPath,
      });

      // Save successful moves so undo data survives later failures.
      try {
        await saveHistory(history);
      } catch (historyError) {
        errors.push(
          `${item.name}: moved, but undo history could not be saved (${String(historyError)}).`,
        );
      }
    } catch (error) {
      skipped += 1;

      errors.push(
        `${item.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    message: `Finished. Moved ${moved} file(s); skipped ${skipped}.`,
    moved,
    skipped,
    errors,
  };
}

async function handleUndo(): Promise<OperationResult> {
  const history = await readHistory();

  if (history.length === 0) {
    return {
      ok: false,
      message: 'No saved move history was found.',
      moved: 0,
      skipped: 0,
      errors: [],
    };
  }

  let restored = 0;
  let skipped = 0;

  const errors: string[] = [];
  const unresolved: MoveRecord[] = [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const move = history[index];

    if (!(await pathExists(move.newPath))) continue;

    // Never overwrite a file at the original location.
    if (await pathExists(move.originalPath)) {
      skipped += 1;
      unresolved.unshift(move);

      errors.push(
        `${path.basename(move.originalPath)}: original path is occupied; not overwritten.`,
      );

      continue;
    }

    try {
      await fs.mkdir(path.dirname(move.originalPath), {
        recursive: true,
      });

      await fs.rename(move.newPath, move.originalPath);
      restored += 1;
    } catch (error) {
      skipped += 1;
      unresolved.unshift(move);

      errors.push(
        `${path.basename(move.originalPath)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (unresolved.length > 0) {
    await saveHistory(unresolved);
  } else {
    try {
      await fs.unlink(getUndoLogPath());
    } catch {
      // Missing history after successful restoration is harmless.
    }
  }

  return {
    ok: skipped === 0,
    message: `Undo finished. Restored ${restored} file(s); unresolved ${skipped}.`,
    moved: restored,
    skipped,
    errors,
  };
}

function registerIpcHandlers(): void {
  ipcMain.handle('organizer:get-settings', async (event) => {
    assertTrustedSender(event);
    return readSettings();
  });

  ipcMain.handle(
    'organizer:save-settings',
    async (event, input: unknown) => {
      assertTrustedSender(event);

      const settings = validateSettings(input);
      await persistSettings(settings);

      return settings;
    },
  );

  ipcMain.handle('organizer:choose-folder', async (event) => {
    assertTrustedSender(event);

    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose a folder to organize',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    selectedDirectory = result.filePaths[0];
    return selectedDirectory;
  });

  ipcMain.handle('organizer:preview', async (event) => {
    assertTrustedSender(event);

    if (!selectedDirectory) {
      throw new Error('Choose a folder first.');
    }

    return buildPreview(selectedDirectory);
  });

  ipcMain.handle('organizer:organize', async (event) => {
    assertTrustedSender(event);
    return handleOrganize();
  });

  ipcMain.handle('organizer:undo', async (event) => {
    assertTrustedSender(event);
    return handleUndo();
  });
}

/**
 * Registers IPC handlers for the custom frameless title bar.
 * These handlers must be registered before the renderer invokes them.
 */
function registerWindowControlHandlers(): void {
  ipcMain.handle('window:minimize', (event) => {
    assertTrustedSender(event);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    assertTrustedSender(event);

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    assertTrustedSender(event);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:is-maximized', (event) => {
    assertTrustedSender(event);

    return Boolean(
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.isMaximized(),
    );
  });
}


function createSplashWindow(): void {
  const iconPath = getAppIconPath();

  splashWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    frame: false,
    resizable: false,
    movable: false,
    center: true,
    show: false,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Development: load public/splash.html.
  // Packaged app: load the Vite-built dist/splash.html.
  const splashHtmlPath = app.isPackaged
    ? path.join(app.getAppPath(), 'dist', 'splash.html')
    : path.join(app.getAppPath(), 'public', 'splash.html');

  void splashWindow.loadFile(splashHtmlPath);

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}


function createWindow(): void {
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    frame: false,
    autoHideMenuBar: true,
    width: 1180,
    height: 780,
    minWidth: 850,
    minHeight: 600,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const windowToShow = mainWindow;
  const startedAt = Date.now();

  windowToShow.on('maximize', () => {
    windowToShow.webContents.send(
      'window:maximized-changed',
      true,
    );
  });

  windowToShow.on('unmaximize', () => {
    windowToShow.webContents.send(
      'window:maximized-changed',
      false,
    );
  });

  windowToShow.once('ready-to-show', () => {
    const remainingDelay = Math.max(
      0,
      SPLASH_DURATION_MS - (Date.now() - startedAt),
    );

    setTimeout(() => {
      if (windowToShow.isDestroyed()) {
        return;
      }

      windowToShow.show();

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }

      splashWindow = null;
    }, remainingDelay);
  });

  windowToShow.on('closed', () => {
    if (mainWindow === windowToShow) {
      mainWindow = null;
    }
  });

  if (app.isPackaged) {
    void windowToShow.loadFile(
      path.join(__dirname, '../../dist/index.html'),
    );
  } else {
    void windowToShow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();

  // IMPORTANT: register the window-control IPC handlers too.
  registerWindowControlHandlers();

  createSplashWindow();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
# DevSoft Folder Organizer — desktop starter

A Windows-first file organizer starter built with React, TypeScript, Bootstrap 5, Electron, Vite, and electron-builder.

## Requirements

- Node.js 22.12+ (Node 24 is suitable)
- npm
- Windows for generating the Windows installer

## Run in development

Open PowerShell in this folder and run:

```powershell
npm install
npm run dev
```

## Build and package for Windows

```powershell
npm run build
npm run dist:win
```

The installer is written to `release/`.

## Current MVP

- Choose a folder using the native Windows folder picker.
- Preview files and target category folders before moving anything.
- Categorize common image, video, audio, document, archive, installer, and code files.
- Leave existing subfolders untouched; do not recursively scan.
- Skip hidden/system files, partial downloads, and files modified in the last five minutes.
- Confirm moves in a native dialog and add numbered names rather than overwrite duplicates.
- Undo the most recent run; a file at its original path is never overwritten during undo.

## Safety architecture

The React renderer cannot access Node.js file-system APIs directly. It calls a small allow-listed API exposed by `electron/preload.ts`; `electron/main.ts` handles folder picking and file operations. Context isolation, disabled Node integration, renderer sandboxing, and IPC sender checks are enabled.

The undo log is saved in Electron's user-data directory, not in the project folder. This is a starter MVP; test with a temporary folder containing copies before using it on important files.


## Editable category rules

Open **Preferences → Custom folders and file types** to rename destination folders, change their file extensions, add rules such as `Design` for `.psd, .ai, .fig`, or remove rules. Save changes before refreshing the preview. Extensions that do not match a rule are placed in `Other`.

Settings are stored locally in Electron's `userData/organizer-settings.json`, not in the project source tree. Folder names and extension assignments are validated in Electron before they are saved. Do not edit files in your Downloads folder during initial testing; use a temporary folder with copies.
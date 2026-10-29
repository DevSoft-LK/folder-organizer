# 📂 Node.js File Organizer CLI

A configurable command-line utility built with **TypeScript and Node.js** that automatically organizes a directory, such as your Downloads folder, by moving files into categorized subfolders (e.g., Documents, Images, and Archives).

## 📸 Demo

### 1. Preview the Changes (Dry Run)

[Dry Run Demo](images/demo-dry-run.png)

### 2. Organize the Files

[Move Files Demo](images/demo-move.png)
### 3. Undo the Changes

[Undo Demo](images/demo-undo.png)

## 🚀 The Problem It Solves

Download folders can quickly become cluttered with documents, images, archives, and other files. Folder Organizer automates this cleanup process, saving time and keeping your workspace organized.

## ✨ Features

- **Custom Configuration:** Define your own categories and file extensions in `config.json` without modifying the source code.
- **Dry-Run Safety:** Preview planned file movements before making any changes.
- **Undo Support:** Attempt to restore files to their original locations using the saved history from the latest organization run.
- **Minimum File Age:** Skip recently modified files to reduce the risk of moving active downloads.
- **System File Protection:** Skip hidden files and common system files.
- **Incomplete Download Protection:** Ignore extensions such as `.crdownload`, `.part`, `.tmp`, and `.download`.
- **Duplicate Filename Handling:** Automatically generate unique filenames, such as `photo (1).jpg`, when a destination filename already exists.
- **Type Safety:** Written in TypeScript with strict compiler checks.

## 🛠️ Tech Stack

- **TypeScript** — Typed application source code.
- **Node.js** — JavaScript runtime.
- **npm** — Package and script management.
- **TypeScript Compiler (`tsc`)** — Compiles TypeScript into JavaScript.
- **Node.js built-in modules:** `fs`, `path`, and other runtime APIs as required.

## 📁 Project Structure

```text
folder-organizer/
├── src/
│   ├── organizer.ts        # Main CLI and undo logic
│   └── types.ts            # TypeScript type definitions
├── dist/                   # Compiled JavaScript output
├── images/
│   ├── demo-dry-run.png
│   ├── demo-move.png
│   └── demo-undo.png
├── config.json             # Local configuration (create locally)
├── config.example.json     # Example configuration
├── undo-history.json       # Generated undo history
├── package.json            # Scripts and project metadata
├── package-lock.json       # Locked dependency versions
├── tsconfig.json           # TypeScript compiler configuration
├── organize.bat            # Windows organizer launcher
├── undo-organizer.bat      # Windows undo launcher
├── .gitignore
└── README.md
```

**Note:** `dist/` and `undo-history.json` are generated files. Your local `config.json` should contain your own directory settings and should not be committed if it contains machine-specific paths.

## 💻 How to Run Locally

### 1. Prerequisites

Install [Node.js](https://nodejs.org/) and npm.

Verify the installation:

```bash
node -v
npm -v
```

### 2. Clone the Repository

```bash
git clone --branch cli https://github.com/DevSoft-LK/folder-organizer.git
cd folder-organizer
```

### 3. Install Dependencies

Install the project dependencies:

```bash
npm install
```

The project requires TypeScript and Node.js type definitions as development dependencies. If they are not already declared in `package.json`, install them with:

```bash
npm install --save-dev typescript @types/node
```

### 4. Set Up Configuration

1. Copy `config.example.json` and name the copy `config.json`.
2. Open `config.json` in a text editor.
3. Set `targetDirectory` to the folder you want to organize.
4. Keep `dryRun` set to `true` for the first test.
5. Customize `minAgeMinutes` and `categories` to match your preferences.

Example configuration:

```json
{
  "targetDirectory": "C:\\Users\\YourUsername\\Downloads",
  "dryRun": true,
  "minAgeMinutes": 5,
  "categories": {
    "Images": [".jpg", ".png", ".gif"],
    "Documents": [".pdf", ".docx", ".txt"],
    "Archives": [".zip", ".rar"]
  }
}
```

Replace `YourUsername` with your Windows username.

**Configuration options:**

| Option | Description |
|---|---|
| `targetDirectory` | Directory to scan and organize. |
| `dryRun` | When `true`, preview planned movements without moving files. |
| `minAgeMinutes` | Skip files modified more recently than this threshold. |
| `categories` | Maps category folder names to supported file extensions. |

Unmapped file extensions are assigned to the `Other` category.

### 5. Build the TypeScript Source

Compile the application:

```bash
npm run build
```

The TypeScript compiler generates JavaScript files in `dist/`.

### 6. Run the Organizer

#### Windows — Easy Way

Double-click the following batch files from the project folder:

- **`organize.bat`** — Builds and runs the organizer.
- **`undo-organizer.bat`** — Builds and attempts to undo the latest organization run.

#### Windows, macOS, Linux — Terminal

To preview or organize files:

```bash
npm start
```

To undo the latest organization run:

```bash
npm run undo
```

To compile without running:

```bash
npm run build
```

The npm commands execute the compiled JavaScript; Node.js does not execute the TypeScript source directly.

## 🛡️ Safety Guidelines

1. **Preview first:** Keep `"dryRun": true` and review the planned destinations.
2. **Enable live mode deliberately:** Set `"dryRun": false` only when the preview looks correct.
3. **Review undo history:** The undo operation relies on the paths recorded during the latest live run. Avoid manually moving or renaming organized files before attempting an undo.
4. **Keep backups:** Undo is not a replacement for a backup, especially if files have been deleted, moved again, or modified after organization.
5. **Protect your configuration:** Keep local settings and generated history out of public commits when appropriate.

## 📦 Development Workflow

The project uses a TypeScript-first workflow:

```text
TypeScript source (src/)
        │
        ▼
TypeScript compiler (tsc)
        │
        ▼
Compiled JavaScript (dist/)
        │
        ▼
Node.js runtime
```

Make source changes in `src/`, rebuild with `npm run build`, and test the behavior before committing your changes.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome. Please test changes with `dryRun` enabled before performing actual file operations.

## 📄 License

See the repository's [LICENSE](https://github.com/DevSoft-LK/folder-organizer/blob/cli/LICENSE) file for licensing terms.

---

Maintained by [DevSoft-LK](https://github.com/DevSoft-LK).
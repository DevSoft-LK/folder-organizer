import * as fs from "node:fs";
import * as path from "node:path";
import type { MoveRecord, OrganizerConfig } from "./types";

// The compiled file is dist/organizer.js, so resolve project data files from
// the project root rather than from dist/.
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_FILE = path.join(PROJECT_ROOT, "config.json");
const UNDO_LOG_FILE = path.join(PROJECT_ROOT, "undo-history.json");

// Safety: do not move incomplete downloads or common Windows/system files.
const SKIP_EXTENSIONS = new Set([".crdownload", ".part", ".tmp", ".download"]);
const SKIP_NAMES = new Set(["desktop.ini", ".ds_store", "thumbs.db"]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrganizerConfig(value: unknown): value is OrganizerConfig {
  if (!isRecord(value)) return false;

  if (
    typeof value.targetDirectory !== "string" ||
    value.targetDirectory.trim().length === 0 ||
    typeof value.dryRun !== "boolean"
  ) {
    return false;
  }

  if (
    value.minAgeMinutes !== undefined &&
    (typeof value.minAgeMinutes !== "number" ||
      !Number.isFinite(value.minAgeMinutes) ||
      value.minAgeMinutes < 0)
  ) {
    return false;
  }

  if (value.categories !== undefined) {
    if (!isRecord(value.categories)) return false;

    for (const extensions of Object.values(value.categories)) {
      if (
        !Array.isArray(extensions) ||
        !extensions.every((extension: unknown) => typeof extension === "string")
      ) {
        return false;
      }
    }
  }

  return true;
}

function isMoveRecord(value: unknown): value is MoveRecord {
  return (
    isRecord(value) &&
    typeof value.originalPath === "string" &&
    typeof value.newPath === "string"
  );
}

// Avoid overwriting: "photo.jpg" becomes "photo (1).jpg", and so on.
function uniquePath(directory: string, filename: string): string {
  let target = path.join(directory, filename);
  if (!fs.existsSync(target)) return target;

  const extension = path.extname(filename);
  const baseName = path.basename(filename, extension);
  let index = 1;

  while (fs.existsSync(target)) {
    target = path.join(directory, `${baseName} (${index})${extension}`);
    index += 1;
  }

  return target;
}

function getCategory(
  extension: string,
  categories: Record<string, string[]>,
): string {
  const normalizedExtension = extension.toLowerCase();

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.some((item) => item.toLowerCase() === normalizedExtension)) {
      return category;
    }
  }

  return "Other";
}

function loadConfig(): OrganizerConfig | undefined {
  try {
    const contents = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed: unknown = JSON.parse(contents);

    if (!isOrganizerConfig(parsed)) {
      throw new Error(
        "Invalid configuration values. Check targetDirectory, dryRun, minAgeMinutes, and categories.",
      );
    }

    return parsed;
  } catch (error: unknown) {
    console.error(
      "❌ Error: Could not load config.json. Ensure the file exists and contains valid configuration.",
    );
    console.error(`   Details: ${errorMessage(error)}`);
    return undefined;
  }
}

// Restore files from the latest organization run.
function undoLastRun(): void {
  console.log("⏪ Attempting to undo the last run...");

  if (!fs.existsSync(UNDO_LOG_FILE)) {
    console.error("❌ Nothing to undo. No history file found.");
    return;
  }

  let history: unknown;
  try {
    history = JSON.parse(fs.readFileSync(UNDO_LOG_FILE, "utf8")) as unknown;
  } catch (error: unknown) {
    console.error("❌ Error: Could not read the undo history file.");
    console.error(`   Details: ${errorMessage(error)}`);
    return;
  }

  if (!Array.isArray(history) || history.length === 0) {
    console.log("❌ History is empty. Nothing to undo.");
    return;
  }

  if (!history.every(isMoveRecord)) {
    console.error("❌ Undo history is malformed. The history file was left unchanged.");
    return;
  }

  let restored = 0;

  try {
    // Reverse order avoids path conflicts when moves depend on one another.
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const move = history[index];
      if (!move) continue;

      if (fs.existsSync(move.newPath)) {
        const originalDirectory = path.dirname(move.originalPath);
        fs.mkdirSync(originalDirectory, { recursive: true });
        fs.renameSync(move.newPath, move.originalPath);
        console.log(`✅ Restored: ${path.basename(move.originalPath)}`);
        restored += 1;
      } else {
        console.log(
          `⚠️ Missing: ${path.basename(move.newPath)} (was it deleted or moved again?)`,
        );
      }
    }

    // Keep the original behavior: consume the history after the undo attempt.
    fs.unlinkSync(UNDO_LOG_FILE);
    console.log(`\n🎉 Undo complete! Successfully restored ${restored} files.`);
  } catch (error: unknown) {
    console.error("❌ Error during undo:", errorMessage(error));
    console.error("   The undo history file has been kept where possible.");
  }
}

function main(): void {
  // Undo does not require config.json to exist or be valid.
  if (process.argv.includes("--undo")) {
    undoLastRun();
    return;
  }

  const config = loadConfig();
  if (!config) {
    process.exitCode = 1;
    return;
  }

  const downloadsDirectory = config.targetDirectory;
  const dryRun = config.dryRun;
  const minAgeMinutes = config.minAgeMinutes ?? 5;
  const categories = config.categories ?? {};

  if (!fs.existsSync(downloadsDirectory)) {
    console.error(`❌ Folder not found: ${downloadsDirectory}`);
    process.exitCode = 1;
    return;
  }

  try {
    if (!fs.statSync(downloadsDirectory).isDirectory()) {
      console.error(`❌ The target path is not a folder: ${downloadsDirectory}`);
      process.exitCode = 1;
      return;
    }
  } catch (error: unknown) {
    console.error(`❌ Could not access target folder: ${errorMessage(error)}`);
    process.exitCode = 1;
    return;
  }

  const now = Date.now();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(downloadsDirectory, { withFileTypes: true });
  } catch (error: unknown) {
    console.error(`❌ Could not scan target folder: ${errorMessage(error)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`📂 Scanning: ${downloadsDirectory}`);
  console.log(
    dryRun
      ? "🔍 DRY RUN — nothing will be moved\n"
      : "⚠️  LIVE MODE — files WILL be moved\n",
  );

  let moved = 0;
  let skipped = 0;
  let foldersLeft = 0;
  const moveHistory: MoveRecord[] = [];

  for (const entry of entries) {
    const fullPath = path.join(downloadsDirectory, entry.name);

    // Leave existing folders alone.
    if (entry.isDirectory()) {
      foldersLeft += 1;
      continue;
    }

    // Skip hidden and system files.
    const lowerName = entry.name.toLowerCase();
    if (SKIP_NAMES.has(lowerName) || entry.name.startsWith(".")) {
      skipped += 1;
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (SKIP_EXTENSIONS.has(extension)) {
      skipped += 1;
      continue;
    }

    // Skip files that have changed recently, as they may still be downloading.
    try {
      const stats = fs.statSync(fullPath);
      const ageMinutes = (now - stats.mtimeMs) / 60_000;
      if (ageMinutes < minAgeMinutes) {
        console.log(`⏳ skip (still new): ${entry.name}`);
        skipped += 1;
        continue;
      }
    } catch {
      skipped += 1;
      continue;
    }

    const category = getCategory(extension, categories);
    const targetDirectory = path.join(downloadsDirectory, category);

    if (dryRun) {
      console.log(`📦 ${entry.name}  →  ${category}/`);
      // Preserve the original CLI's summary semantics: this is a planned move.
      moved += 1;
      continue;
    }

    try {
      fs.mkdirSync(targetDirectory, { recursive: true });
      const finalPath = uniquePath(targetDirectory, entry.name);
      fs.renameSync(fullPath, finalPath);
      console.log(
        `✅ ${entry.name}  →  ${path.relative(downloadsDirectory, finalPath)}`,
      );

      moveHistory.push({ originalPath: fullPath, newPath: finalPath });
      moved += 1;
    } catch (error: unknown) {
      console.error(`❌ Failed to move ${entry.name}: ${errorMessage(error)}`);
      skipped += 1;
    }
  }

  // Save undo history only after a live run that moved at least one file.
  if (!dryRun && moveHistory.length > 0) {
    try {
      fs.writeFileSync(UNDO_LOG_FILE, JSON.stringify(moveHistory, null, 2), "utf8");
    } catch (error: unknown) {
      console.error(`❌ Could not save undo history: ${errorMessage(error)}`);
      console.error("   Files were moved, but undo history may be unavailable.");
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Moved     : ${moved}`);
  console.log(`Skipped   : ${skipped}`);
  console.log(`Folders   : ${foldersLeft} (untouched)`);

  if (dryRun && moved > 0) {
    console.log('\n💡 Set "dryRun": false in config.json to move files.');
  } else if (!dryRun && moved > 0) {
    console.log("\n💡 Run `node dist/organizer.js --undo` to revert the last run.");
  }
}

main();
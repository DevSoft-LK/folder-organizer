// organizer.js — Downloads folder organizer
const fs = require('fs');
const path = require('path');

// ============ SETTINGS ============

const DOWNLOADS = 'C:\\Users\\YourUsername\\Downloads'; // ← Change this to your Downloads or any other folder path
const DRY_RUN = true;          // ← START WITH true. Change to false only after testing.
const MIN_AGE_MINUTES = 5;     // skip files modified in last 5 minutes
// ==================================

const CATEGORIES = {
  Images:     ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic', '.tiff'],
  Documents:  ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.epub'],
  Videos:     ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.flv', '.wmv', '.m4v'],
  Audio:      ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
  Archives:   ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso'],
  Installers: ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage'],
  Code:       ['.js', '.ts', '.py', '.html', '.css', '.json', '.java', '.ipynb', '.c', '.cpp', '.cs', '.rb', '.php', '.go', '.rs', '.sh', '.bat'],
  Database:   ['.sql'],
};

const SKIP_EXTENSIONS = ['.crdownload', '.part', '.tmp', '.download'];
const SKIP_NAMES = ['desktop.ini', '.ds_store', 'thumbs.db'];

function getCategory(ext) {
  ext = ext.toLowerCase();
  for (const [cat, exts] of Object.entries(CATEGORIES)) {
    if (exts.includes(ext)) return cat;
  }
  return 'Other';
}

// Avoid overwriting: "photo.jpg" → "photo (1).jpg"
function uniquePath(dir, filename) {
  let target = path.join(dir, filename);
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let i = 1;
  while (fs.existsSync(target)) {
    target = path.join(dir, `${base} (${i})${ext}`);
    i++;
  }
  return target;
}

function main() {
  if (!fs.existsSync(DOWNLOADS)) {
    console.error(`❌ Folder not found: ${DOWNLOADS}`);
    process.exit(1);
  }

  const now = Date.now();
  const entries = fs.readdirSync(DOWNLOADS, { withFileTypes: true });

  console.log(`📂 Scanning: ${DOWNLOADS}`);
  console.log(DRY_RUN
    ? '🔍 DRY RUN — nothing will be moved\n'
    : '⚠️  LIVE MODE — files WILL be moved\n');

  let moved = 0, skipped = 0, foldersLeft = 0;

  for (const entry of entries) {
    const fullPath = path.join(DOWNLOADS, entry.name);

    // Leave existing folders alone
    if (entry.isDirectory()) { foldersLeft++; continue; }

    // Skip hidden / system files
    if (SKIP_NAMES.includes(entry.name.toLowerCase()) || entry.name.startsWith('.')) {
      skipped++; continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (SKIP_EXTENSIONS.includes(ext)) { skipped++; continue; }

    // Skip files still downloading
    try {
      const stat = fs.statSync(fullPath);
      const ageMin = (now - stat.mtimeMs) / 60000;
      if (ageMin < MIN_AGE_MINUTES) {
        console.log(`⏳ skip (still new): ${entry.name}`);
        skipped++; continue;
      }
    } catch { skipped++; continue; }

    const category = getCategory(ext);
    const targetDir = path.join(DOWNLOADS, category);

    if (DRY_RUN) {
      console.log(`📦 ${entry.name}  →  ${category}/`);
      moved++;
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
      const finalPath = uniquePath(targetDir, entry.name);
      fs.renameSync(fullPath, finalPath);
      console.log(`✅ ${entry.name}  →  ${path.relative(DOWNLOADS, finalPath)}`);
      moved++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Moved     : ${moved}`);
  console.log(`Skipped   : ${skipped}`);
  console.log(`Folders   : ${foldersLeft} (untouched)`);
  if (DRY_RUN) console.log('\n💡 Set DRY_RUN = false in the script to  move files.');
}

main();
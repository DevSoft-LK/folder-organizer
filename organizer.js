// organizer.js — Downloads folder organizer
const fs = require('fs');
const path = require('path');

// Constants
const CONFIG_FILE = path.join(__dirname, 'config.json');
const UNDO_LOG_FILE = path.join(__dirname, 'undo-history.json');

// Static skip lists (hardcoded for safety, so users don't accidentally move partial downloads)
const SKIP_EXTENSIONS = ['.crdownload', '.part', '.tmp', '.download'];
const SKIP_NAMES = ['desktop.ini', '.ds_store', 'thumbs.db'];

// ============ HELPER FUNCTIONS ============

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

// Determine the category based on the file extension and config
function getCategory(ext, categories) {
  ext = ext.toLowerCase();
  for (const [cat, exts] of Object.entries(categories)) {
    if (Array.isArray(exts) && exts.map(e => e.toLowerCase()).includes(ext)) {
      return cat;
    }
  }
  return 'Other'; // Default folder for unmapped extensions
}

// ============ UNDO LOGIC ============
function undoLastRun() {
  console.log('⏪ Attempting to undo the last run...');
  
  if (!fs.existsSync(UNDO_LOG_FILE)) {
    console.error('❌ Nothing to undo. No history file found.');
    return;
  }

  try {
    const history = JSON.parse(fs.readFileSync(UNDO_LOG_FILE, 'utf8'));
    
    if (!Array.isArray(history) || history.length === 0) {
      console.log('❌ History is empty. Nothing to undo.');
      return;
    }

    let restored = 0;

    // Loop backwards to undo the most recent moves first
    for (let i = history.length - 1; i >= 0; i--) {
      const move = history[i];
      
      // Check if the moved file still exists in its categorized folder
      if (fs.existsSync(move.newPath)) {
        const originalDir = path.dirname(move.originalPath);
        
        // Ensure original directory exists (just in case)
        if (!fs.existsSync(originalDir)) {
          fs.mkdirSync(originalDir, { recursive: true });
        }

        // Move it back
        fs.renameSync(move.newPath, move.originalPath);
        console.log(`✅ Restored: ${path.basename(move.originalPath)}`);
        restored++;
      } else {
        console.log(`⚠️ Missing: ${path.basename(move.newPath)} (was it deleted or moved again?)`);
      }
    }

    // Delete the log file after successful undo so it can't be undone twice
    fs.unlinkSync(UNDO_LOG_FILE);
    console.log(`\n🎉 Undo complete! Successfully restored ${restored} files.`);

  } catch (error) {
    console.error('❌ Error during undo:', error.message);
  }
}

// ============ MAIN LOGIC ============
function main() {
  // 1. Check for Undo command FIRST (doesn't require config.json to be valid)
  if (process.argv.includes('--undo')) {
    undoLastRun();
    return;
  }

  // 2. Load Configuration
  let config;
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(configData);
  } catch (err) {
    console.error('❌ Error: Could not load config.json. Ensure the file exists and has valid JSON syntax.');
    console.error(`   Details: ${err.message}`);
    process.exit(1);
  }

  const DOWNLOADS = config.targetDirectory;
  const DRY_RUN = config.dryRun;
  const MIN_AGE_MINUTES = config.minAgeMinutes ?? 5;
  const CATEGORIES = config.categories || {};

  // 3. Validate Target Directory
  if (!DOWNLOADS || !fs.existsSync(DOWNLOADS)) {
    console.error(`❌ Folder not found: ${DOWNLOADS || '(Not specified in config.json)'}`);
    process.exit(1);
  }

  const now = Date.now();
  const entries = fs.readdirSync(DOWNLOADS, { withFileTypes: true });

  console.log(`📂 Scanning: ${DOWNLOADS}`);
  console.log(DRY_RUN
    ? '🔍 DRY RUN — nothing will be moved\n'
    : '⚠️  LIVE MODE — files WILL be moved\n');

  let moved = 0, skipped = 0, foldersLeft = 0;
  const moveHistory = [];

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
    } catch { 
      skipped++; 
      continue; 
    }

    const category = getCategory(ext, CATEGORIES);
    const targetDir = path.join(DOWNLOADS, category);

    if (DRY_RUN) {
      console.log(`📦 ${entry.name}  →  ${category}/`);
      moved++;
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
      const finalPath = uniquePath(targetDir, entry.name);
      
      try {
        fs.renameSync(fullPath, finalPath);
        console.log(`✅ ${entry.name}  →  ${path.relative(DOWNLOADS, finalPath)}`);
        
        // Record the move for Undo
        moveHistory.push({
          originalPath: fullPath,
          newPath: finalPath
        });
        moved++;
      } catch (err) {
        console.error(`❌ Failed to move ${entry.name}: ${err.message}`);
        skipped++;
      }
    }
  }

  // Save history for Undo
  if (!DRY_RUN && moveHistory.length > 0) {
    fs.writeFileSync(UNDO_LOG_FILE, JSON.stringify(moveHistory, null, 2));
  }

  console.log(`\n--- Summary ---`);
  console.log(`Moved     : ${moved}`);
  console.log(`Skipped   : ${skipped}`);
  console.log(`Folders   : ${foldersLeft} (untouched)`);
  
  if (DRY_RUN && moved > 0) {
    console.log('\n💡 Set "dryRun": false in config.json to move files.');
  } else if (!DRY_RUN && moved > 0) {
    console.log('\n💡 Ctrl+Z: Run `node organizer.js --undo` to revert the last run.');
  }
}

main();
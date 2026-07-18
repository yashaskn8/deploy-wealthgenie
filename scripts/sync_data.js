/**
 * WealthGenie — Data Synchronization Script
 * ─────────────────────────────────────────
 * Copies c:/Users/prana/OneDrive/Desktop/deploy-wealthgenie/shared/investment_master.json
 * to frontend (reactapp/src/data/investment_master.json) and backend (server/data/investment_master.json)
 * so they can be loaded using simple relative imports.
 */

import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const sourceFile = resolve(ROOT, 'shared/investment_master.json');
const destFrontendDir = resolve(ROOT, 'reactapp/src/data');
const destBackendDir = resolve(ROOT, 'server/data');

if (!existsSync(sourceFile)) {
  console.error(`❌ Source file not found: ${sourceFile}. Make sure to generate it first.`);
  process.exit(1);
}

// Ensure target directories exist
if (!existsSync(destFrontendDir)) {
  mkdirSync(destFrontendDir, { recursive: true });
}
if (!existsSync(destBackendDir)) {
  mkdirSync(destBackendDir, { recursive: true });
}

// Copy file to targets
const destFrontend = resolve(destFrontendDir, 'investment_master.json');
const destBackend = resolve(destBackendDir, 'investment_master.json');

try {
  copyFileSync(sourceFile, destFrontend);
  console.log(`✓ Synchronized master database to React Frontend: ${destFrontend}`);

  copyFileSync(sourceFile, destBackend);
  console.log(`✓ Synchronized master database to Express Backend: ${destBackend}`);

  process.exit(0);
} catch (error) {
  console.error(`❌ Failed to sync master database: ${error.message}`);
  process.exit(1);
}

/**
 * WealthGenie data synchronization tool.
 *
 * shared/investment_master.json is the canonical source. This script materializes
 * app-local copies that are committed into each isolated deployable context:
 * - reactapp/src/data/investment_master.json
 * - server/data/investment_master.json
 *
 * Usage:
 *   node scripts/sync_data.js          Copy canonical data into app contexts
 *   node scripts/sync_data.js --check  Verify committed copies are current
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check') || args.has('-c');

if (args.has('--help') || args.has('-h')) {
  console.log('Usage: node scripts/sync_data.js [--check]');
  process.exit(0);
}

const supportedArgs = new Set(['--check', '-c', '--help', '-h']);
const unknownArgs = [...args].filter(arg => !supportedArgs.has(arg));
if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  process.exit(1);
}

const sourceFile = resolve(rootDir, 'shared', 'investment_master.json');
const targets = [
  {
    label: 'React frontend',
    path: resolve(rootDir, 'reactapp', 'src', 'data', 'investment_master.json')
  },
  {
    label: 'Express backend',
    path: resolve(rootDir, 'server', 'data', 'investment_master.json')
  }
];

function fromRoot(path) {
  return relative(rootDir, path).replace(/\\/g, '/');
}

function readBuffer(path) {
  return readFileSync(path);
}

if (!existsSync(sourceFile)) {
  console.error(`Source data file not found: ${fromRoot(sourceFile)}`);
  process.exit(1);
}

if (checkOnly) {
  const source = readBuffer(sourceFile);
  const failures = [];

  for (const target of targets) {
    if (!existsSync(target.path)) {
      failures.push(`${target.label} copy is missing: ${fromRoot(target.path)}`);
      continue;
    }

    const targetData = readBuffer(target.path);
    if (!source.equals(targetData)) {
      failures.push(`${target.label} copy is stale: ${fromRoot(target.path)}`);
    }
  }

  if (failures.length > 0) {
    console.error('Investment data artifacts are not synchronized:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error('Run `node scripts/sync_data.js` from the repository root and commit the updated app-local data files.');
    process.exit(1);
  }

  console.log('Investment data artifacts are synchronized.');
  process.exit(0);
}

try {
  for (const target of targets) {
    mkdirSync(dirname(target.path), { recursive: true });
    copyFileSync(sourceFile, target.path);
    console.log(`Synchronized ${target.label}: ${fromRoot(target.path)}`);
  }
} catch (error) {
  console.error(`Failed to synchronize investment data: ${error.message}`);
  process.exit(1);
}

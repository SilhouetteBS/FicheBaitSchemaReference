import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const forbiddenStrings = [
  'Manual documentation notes',
  'Import preview',
  'Import locked',
  'Import notes',
  'Drop export JSON files',
  'Export notes.json',
  'Editing enabled',
  'ManualNotesEditor',
];

function runPublicBuild() {
  for (const script of ['sync-public-data.mjs', 'generate-ai-export.mjs']) {
    const preparation = spawnSync(process.execPath, [join('tools', script)], { stdio: 'inherit' });
    if (preparation.status !== 0) process.exit(preparation.status ?? 1);
  }
  const viteEntrypoint = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
  const result = spawnSync(process.execPath, [viteEntrypoint, 'build'], {
    env: {
      ...process.env,
      VITE_ENABLE_EDITING: 'false',
    },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Unable to run public build: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function listFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const details = await stat(fullPath);
    if (details.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

runPublicBuild();

const distDir = join(process.cwd(), 'dist');
const files = await listFiles(distDir);
const failures = [];

for (const file of files) {
  const content = await readFile(file, 'utf8').catch(() => '');
  for (const forbiddenString of forbiddenStrings) {
    if (content.includes(forbiddenString) || file.includes(forbiddenString)) {
      failures.push(`${relative(process.cwd(), file)} contains ${JSON.stringify(forbiddenString)}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Public build contains editing-only content:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Public build verified: editing UI content was not emitted.');

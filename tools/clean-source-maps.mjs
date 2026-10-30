// Remove unpublished debugging artifacts from the static output, including offline builds.
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await clean(path);
    else if (entry.name.endsWith('.map')) await rm(path);
  }
}
await clean('dist');
console.log('Public output contains no source-map files.');

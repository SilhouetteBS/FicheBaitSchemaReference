import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const products = ['forms', 'lfds', 'repository', 'workflow'];

function listJsonFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listJsonFiles(path) : path.endsWith('.json') ? [path] : [];
  });
}

const checked = [];
for (const product of products) {
  const sourceRoot = join(process.cwd(), 'data', product);
  const publicRoot = join(process.cwd(), 'public', 'data', product);
  for (const sourcePath of listJsonFiles(sourceRoot)) {
    const relativePath = relative(sourceRoot, sourcePath);
    const publicPath = join(publicRoot, relativePath);
    assert.ok(existsSync(publicPath), `Public data mirror is missing ${product}/${relativePath}`);
    assert.deepEqual(
      readFileSync(publicPath),
      readFileSync(sourcePath),
      `Public data mirror differs from canonical data/${product}/${relativePath}`,
    );
    checked.push(`${product}/${relativePath}`);
  }
}

console.log(`Verified ${checked.length} canonical schema and notes files against public/data.`);

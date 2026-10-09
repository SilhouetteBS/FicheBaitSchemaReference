import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public/data');
const source = path.resolve('data');
const products = JSON.parse(fs.readFileSync(path.join(source, 'products.json'), 'utf8'));
const files = ['products.json'];
for (const product of products.products.filter((item) => item.status === 'available')) {
  if (!/^[a-z0-9-]+$/.test(product.productKey)) throw new Error('Invalid canonical product key.');
  const manifestPath = `${product.productKey}/versions.json`;
  const manifest = JSON.parse(fs.readFileSync(path.join(source, manifestPath), 'utf8'));
  files.push(manifestPath);
  for (const entry of manifest.versions) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.version)) throw new Error('Invalid canonical version.');
    for (const name of ['schema.json', 'notes.json']) files.push(`${product.productKey}/${entry.version}/${name}`);
  }
}
const expected = new Set(files.map((file) => path.resolve(root, file)));
function prune(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.resolve(directory, entry.name);
    if (!target.startsWith(`${root}${path.sep}`) || entry.isSymbolicLink()) throw new Error(`Unsafe generated path: ${target}`);
    if (directory === root && entry.name === 'ai') continue;
    if (entry.isDirectory()) prune(target);
    else if (!expected.has(target)) fs.unlinkSync(target);
  }
}
prune(root);
for (const file of files) {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(source, file), destination);
}
console.log(`Generated ${files.length} public metadata files from canonical data.`);

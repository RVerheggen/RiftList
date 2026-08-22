import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const excludedDirectories = new Set(['.git', 'dist', 'node_modules']);
const textExtensions = new Set([
  '.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.ts', '.tsx', '.webmanifest', '.yaml', '.yml',
]);

async function collectTextFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTextFiles(path));
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

test('repository text does not contain em dashes', async () => {
  const forbiddenCharacter = String.fromCodePoint(0x2014);
  const offenders = [];
  for (const path of await collectTextFiles(repositoryRoot)) {
    if ((await readFile(path, 'utf8')).includes(forbiddenCharacter)) {
      offenders.push(relative(repositoryRoot, path));
    }
  }
  assert.deepEqual(offenders, []);
});

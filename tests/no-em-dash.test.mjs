import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const excludedDirectories = new Set(['.git', 'dist', 'node_modules']);
const excludedToolingPaths = new Set([
  '.agents',
  '.codex',
  '.github/agents',
  '.github/hooks',
  '.github/skills',
]);
const textExtensions = new Set([
  '.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.ts', '.tsx', '.webmanifest', '.yaml', '.yml',
]);

function isExcludedToolingPath(path) {
  const repositoryPath = relative(repositoryRoot, path).replaceAll('\\', '/');
  return excludedToolingPaths.has(repositoryPath);
}

async function collectTextFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && (excludedDirectories.has(entry.name) || isExcludedToolingPath(path))) continue;
    if (entry.isDirectory()) files.push(...await collectTextFiles(path));
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

test('RiftList-owned code and documentation do not contain em dashes', async () => {
  const forbiddenCharacter = String.fromCodePoint(0x2014);
  const offenders = [];
  for (const path of await collectTextFiles(repositoryRoot)) {
    if ((await readFile(path, 'utf8')).includes(forbiddenCharacter)) {
      offenders.push(relative(repositoryRoot, path));
    }
  }
  assert.deepEqual(offenders, []);
});

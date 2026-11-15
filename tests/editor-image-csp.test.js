import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(
  await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
);
const contentSecurityPolicy = config.headers
  .flatMap((entry) => entry.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value;

test('Content Security Policy allows local blob images in the editor', () => {
  assert.match(contentSecurityPolicy || '', /img-src[^;]*\bblob:/);
});

test('Content Security Policy allows the editor to compile WebAssembly', () => {
  assert.match(contentSecurityPolicy || '', /script-src[^;]*'wasm-unsafe-eval'/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const cliPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
  });
}

test('feishu2wx -v prints package.json version', () => {
  const result = runCli(['-v']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), version);
});

test('feishu2wx --version prints package.json version', () => {
  const result = runCli(['--version']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), version);
});

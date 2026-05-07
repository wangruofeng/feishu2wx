import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

test('start script does not hardcode HOST binding', () => {
  assert.equal(typeof pkg.scripts?.start, 'string');
  assert.doesNotMatch(
    pkg.scripts.start,
    /\bHOST=/,
    'start script should not force a specific host; let the environment override it when needed'
  );
});

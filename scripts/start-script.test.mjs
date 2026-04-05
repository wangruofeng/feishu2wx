import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPackagePath = path.join(__dirname, '..', 'frontend', 'package.json');
const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));

test('frontend start script does not hardcode HOST binding', () => {
  assert.equal(typeof frontendPackage.scripts?.start, 'string');
  assert.doesNotMatch(
    frontendPackage.scripts.start,
    /\bHOST=/,
    'start script should not force a specific host; let the environment override it when needed'
  );
});

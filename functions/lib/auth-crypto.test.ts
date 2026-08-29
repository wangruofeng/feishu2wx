import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { decryptConfig, encryptConfig, signSession, verifySession } from './auth-crypto';

const bytes = (value: number) => Buffer.alloc(32, value).toString('base64url');
const env = { AI_CONFIG_ENCRYPTION_KEY: bytes(1), AUTH_SESSION_SIGNING_KEY: bytes(2) };

test('encrypts configuration with a user-scoped authenticated payload', async () => {
  const encrypted = await encryptConfig('{"apiKey":"secret"}', '42', env);
  assert.doesNotMatch(JSON.stringify(encrypted), /secret/);
  assert.equal(await decryptConfig(encrypted, '42', env), '{"apiKey":"secret"}');
  await assert.rejects(() => decryptConfig(encrypted, '43', env));
});

test('rejects tampered and expired sessions', async () => {
  const token = await signSession({ sub: '42', login: 'octo', avatarUrl: '', exp: 200 }, env);
  assert.equal((await verifySession(token, env, 100))?.sub, '42');
  assert.equal(await verifySession(`${token}x`, env, 100), null);
  assert.equal(await verifySession(token, env, 200), null);
});

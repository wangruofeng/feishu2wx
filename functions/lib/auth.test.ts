import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeOAuth, type PagesAuthEnv } from './auth';

const key = Buffer.alloc(32, 1).toString('base64url');
const env = { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret', AI_CONFIG_ENCRYPTION_KEY: key, AUTH_SESSION_SIGNING_KEY: 'invalid', AI_CONFIGS_KV: {} } as PagesAuthEnv;

test('identifies an invalid session signing key after GitHub succeeds', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => String(url).includes('access_token')
    ? Response.json({ access_token: 'token' })
    : Response.json({ id: 1, login: 'octo', avatar_url: '' });
  try {
    const response = await completeOAuth(new Request('https://example.com/api/auth/github/callback?code=code&state=state', { headers: { Cookie: 'feishu2wx_oauth_state=state' } }), env);
    assert.equal(response.status, 503);
    assert.match(await response.text(), /AUTH_SESSION_SIGNING_KEY/);
  } finally { global.fetch = originalFetch; }
});

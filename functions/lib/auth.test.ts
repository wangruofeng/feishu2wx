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

test('redirects back with ai_login flag and session cookie after successful login', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => String(url).includes('access_token')
    ? Response.json({ access_token: 'token' })
    : Response.json({ id: 1, login: 'octo', avatar_url: 'https://example.com/a.png' });
  try {
    const response = await completeOAuth(new Request('https://feishu2wx.wangruofeng007.com/api/auth/github/callback?code=code&state=state', { headers: { Cookie: 'feishu2wx_oauth_state=state' } }), { ...env, AUTH_SESSION_SIGNING_KEY: key });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), 'https://feishu2wx.wangruofeng007.com/?ai_login=1');
    assert.match(response.headers.get('Set-Cookie') ?? '', /^feishu2wx_session=/);
  } finally { global.fetch = originalFetch; }
});

test('returns a readable client error when GitHub rejects the authorization code', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => Response.json({ error: 'bad_verification_code' }, { status: 400 });
  try {
    const response = await completeOAuth(new Request('https://example.com/api/auth/github/callback?code=code&state=state', { headers: { Cookie: 'feishu2wx_oauth_state=state' } }), { ...env, AUTH_SESSION_SIGNING_KEY: key });
    assert.equal(response.status, 400);
    assert.match(await response.text(), /授权码交换失败/);
  } finally { global.fetch = originalFetch; }
});

test('does not return a Cloudflare-rewritten 502 when GitHub user lookup fails', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) return Response.json({ access_token: 'token' });
    throw new Error('network failed');
  };
  try {
    const response = await completeOAuth(new Request('https://example.com/api/auth/github/callback?code=code&state=state', { headers: { Cookie: 'feishu2wx_oauth_state=state' } }), { ...env, AUTH_SESSION_SIGNING_KEY: key });
    assert.equal(response.status, 503);
    assert.match(await response.text(), /api\.github\.com/);
  } finally { global.fetch = originalFetch; }
});

test('reports a readable rejection when GitHub answers a non-JSON block page without User-Agent', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) return Response.json({ access_token: 'token' });
    return new Response('Request forbidden by administrative rules. Please make sure your request has a User-Agent header', { status: 403 });
  };
  try {
    const response = await completeOAuth(new Request('https://example.com/api/auth/github/callback?code=code&state=state', { headers: { Cookie: 'feishu2wx_oauth_state=state' } }), { ...env, AUTH_SESSION_SIGNING_KEY: key });
    assert.equal(response.status, 400);
    assert.match(await response.text(), /HTTP 403/);
  } finally { global.fetch = originalFetch; }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { aiRequestOptions, handleAiProviderRequest, type AiPagesContext } from './ai-request';
import { signSession } from './auth-crypto';
import { saveCloudConfig, type CloudConfig } from './cloud-ai-config';
import type { PagesAuthEnv } from './auth';

const origin = 'https://feishu2wx.wangruofeng007.com';
const context = (body: unknown, headers: Record<string, string> = {}): AiPagesContext => ({ request: new Request(`${origin}/api/ai/models`, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
}) });

test('preserves local BYOK, SSE response and allowed origin headers', async () => {
  const response = await handleAiProviderRequest(context({ provider: { apiKey: 'local' } }), async body => {
    assert.equal((body as any).provider.apiKey, 'local');
    return new Response('data: {"type":"delta","text":"你好"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  }, 1024);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match(response.headers.get('Content-Type')!, /text\/event-stream/);
  assert.match(await response.text(), /你好/);
});

test('rejects disallowed origins, oversized and malformed bodies before calling handlers', async () => {
  let called = false;
  const handler = async () => { called = true; return Response.json({}); };
  assert.equal((await handleAiProviderRequest(context({}, { Origin: 'https://untrusted.example' }), handler, 1024)).status, 403);
  assert.equal((await handleAiProviderRequest(context({ text: '很长'.repeat(20) }), handler, 32)).status, 413);
  assert.equal((await handleAiProviderRequest(context(null), handler, 1024)).status, 400);
  assert.equal(called, false);
  assert.equal(aiRequestOptions(context({})).status, 204);
});

test('cloud provider requests require a session instead of falling back to browser secrets', async () => {
  const response = await handleAiProviderRequest(context({ providerId: 'p1', provider: { apiKey: 'browser' } }), async () => Response.json({}), 1024);
  assert.equal(response.status, 401);
});

test('uses only the signed-in user encrypted provider; never returns its key', async () => {
  const values = new Map<string, string>();
  const env = {
    AI_CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64url'),
    AUTH_SESSION_SIGNING_KEY: Buffer.alloc(32, 2).toString('base64url'),
    AI_CONFIGS_KV: { get: async (key: string) => values.get(key) ?? null, put: async (key: string, value: string) => { values.set(key, value); } },
  } as unknown as PagesAuthEnv;
  const config: CloudConfig = { activeProviderId: 'mine', activeModelId: 'gemini', providers: [{
    id: 'mine', name: 'Google', enabled: true, baseUrl: 'https://generativelanguage.googleapis.com',
    apiFormat: 'google-generative-ai', apiKey: 'cloud-secret', models: [{ id: 'gemini' }],
  }] };
  await saveCloudConfig('user-a', config, env);
  await saveCloudConfig('user-b', { ...config, providers: [{ ...config.providers[0], id: 'other' }] }, env);
  const cookie = await signSession({ sub: 'user-a', login: 'a', avatarUrl: '', exp: Date.now() + 60_000 }, env);
  const ctx = { ...context({ providerId: 'mine', provider: { apiKey: 'browser-override' } }, { Cookie: `feishu2wx_session=${cookie}` }), env };
  const response = await handleAiProviderRequest(ctx, async raw => {
    assert.equal((raw as any).provider.apiKey, 'cloud-secret');
    assert.equal((raw as any).provider.apiFormat, 'google-generative-ai');
    return Response.json({ models: ['gemini'] });
  }, 1024);
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /secret|override/);
  const other = { ...context({ providerId: 'other' }, { Cookie: `feishu2wx_session=${cookie}` }), env };
  assert.equal((await handleAiProviderRequest(other, async () => { throw new Error('should not run'); }, 1024)).status, 400);
});

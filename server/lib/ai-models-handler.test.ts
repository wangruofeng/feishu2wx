import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModelCatalogRequest, createAiModelsHandler } from './ai-models-handler';

const provider = { baseUrl: 'https://api.example.com/v1', apiKey: 'test-key', apiFormat: 'chat-completions' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test('catalog URLs and credentials match the four protocols and official MiMo / DeepSeek catalogs', () => {
  for (const [baseUrl, apiFormat, expected] of [
    ['https://api.example.com/v1/chat/completions', 'chat-completions', 'https://api.example.com/v1/models'],
    ['https://api.example.com/v1/responses', 'responses', 'https://api.example.com/v1/models'],
    ['https://api.anthropic.com/v1', 'anthropic', 'https://api.anthropic.com/v1/models'],
    ['https://generativelanguage.googleapis.com', 'google-generative-ai', 'https://generativelanguage.googleapis.com/v1beta/models'],
    ['https://proxy.example.com', 'google-generative-ai', 'https://proxy.example.com/v1beta/models'],
    ['https://api.example.com/v1beta/models/gemini-test:streamGenerateContent?alt=sse', 'google-generative-ai', 'https://api.example.com/v1beta/models'],
    ['https://api.xiaomimimo.com/anthropic', 'anthropic', 'https://api.xiaomimimo.com/v1/models'],
    ['https://api.deepseek.com/anthropic', 'anthropic', 'https://api.deepseek.com/models'],
  ]) {
    const result = buildModelCatalogRequest({ ...provider, baseUrl, apiFormat });
    assert.equal(result.url, expected);
    if (result.format === 'google-generative-ai') assert.equal(result.headers['x-goog-api-key'], provider.apiKey);
    else if (result.format === 'anthropic') assert.equal(result.headers['x-api-key'], provider.apiKey);
    else assert.equal(result.headers.Authorization, `Bearer ${provider.apiKey}`);
  }
});

test('paginates Google models, removes the prefix, filters embeddings and deduplicates', async () => {
  const urls: string[] = [];
  const handler = createAiModelsHandler((async (url, init) => {
    urls.push(String(url));
    assert.equal(init?.redirect, 'manual');
    assert.equal((init?.headers as Record<string, string>)['x-goog-api-key'], 'test-key');
    return urls.length === 1 ? json({ models: [
      { name: 'models/gemini-2', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
    ], nextPageToken: 'page 2' }) : json({ models: [{ name: 'models/gemini-1' }, { name: 'models/gemini-2' }] });
  }) as typeof fetch);
  const response = await handler({ provider: { ...provider, baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiFormat: 'google-generative-ai' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { models: ['gemini-1', 'gemini-2'] });
  assert.match(urls[1], /pageToken=page\+2/);
});

test('merges Anthropic pages and refuses repeating pagination tokens', async () => {
  let calls = 0;
  const handler = createAiModelsHandler((async () => { calls++; return json({ data: [{ id: 'claude' }], has_more: true, last_id: 'same' }); }) as typeof fetch);
  const response = await handler({ provider: { ...provider, apiFormat: 'anthropic' } });
  assert.equal(response.status, 502);
  assert.match((await response.json() as any).error, /分页异常/);
  assert.equal(calls, 2);
});

test('supports a Google-compatible gateway returning a bearer-authenticated OpenAI catalog', async () => {
  let calls = 0;
  const handler = createAiModelsHandler((async (_url, init) => {
    calls++;
    if (calls === 1) return json({}, 401);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
    return json({ data: [{ id: 'gemini-test' }] });
  }) as typeof fetch);
  const response = await handler({ provider: { ...provider, apiFormat: 'google-generative-ai' } });
  assert.deepEqual(await response.json(), { models: ['gemini-test'] });
});

test('rejects an incomplete Anthropic pagination response instead of returning a partial catalog as complete', async () => {
  const handler = createAiModelsHandler((async () => json({ data: [{ id: 'claude' }], has_more: true })) as typeof fetch);
  const response = await handler({ provider: { ...provider, apiFormat: 'anthropic' } });
  assert.equal(response.status, 502);
  assert.match((await response.json() as any).error, /分页异常/);
});

test('does not expose upstream error text or follow redirects', async () => {
  for (const status of [401, 302]) {
    const handler = createAiModelsHandler((async (_url, init) => {
      assert.equal(init?.redirect, 'manual');
      return json({ error: { message: 'upstream leaked test-key' } }, status);
    }) as typeof fetch);
    const response = await handler({ provider });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /test-key/);
  }
});

test('refuses private hosts before fetching and rejects malformed catalogs', async () => {
  let called = false;
  const handler = createAiModelsHandler((async () => { called = true; return json({ wrong: [] }); }) as typeof fetch);
  for (const baseUrl of ['http://localhost', 'http://192.168.1.2', 'http://169.254.169.254', 'http://[::ffff:127.0.0.1]']) {
    assert.equal((await handler({ provider: { ...provider, baseUrl } })).status, 400);
    assert.equal(called, false);
  }
  assert.equal((await handler({ provider })).status, 502);
});

test('local development fetches a private model catalog only with server permission', async () => {
  let calls = 0;
  const handler = createAiModelsHandler((async () => { calls++; return json({ data: [{ id: 'local-model' }] }); }) as typeof fetch);
  const body = { provider: { ...provider, baseUrl: 'http://127.0.0.1:11434/v1' }, allowPrivateHosts: true };
  assert.equal((await handler(body)).status, 400);
  assert.equal(calls, 0);
  const response = await handler(body, { allowPrivateHosts: true });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { models: ['local-model'] });
  assert.equal(calls, 1);
});

test('local proxy root, version root and full endpoints use the v1 model catalog', () => {
  for (const apiFormat of ['chat-completions', 'responses']) {
    const suffix = apiFormat === 'responses' ? 'responses' : 'chat/completions';
    for (const origin of ['http://127.0.0.1:8317', 'http://localhost:8317', 'http://[::1]:8317']) {
      for (const path of ['', '/', '/v1', `/v1/${suffix}/`]) {
        assert.equal(buildModelCatalogRequest({ ...provider, baseUrl: origin + path, apiFormat }).url, `${origin}/v1/models`);
      }
    }
  }
});

test('Google catalog accepts catalog and generateContent endpoints without duplicating models', () => {
  for (const path of ['/prefix/v1beta/models/', '/prefix/v1beta/models/gemini:generateContent', '/prefix/v1beta/models/gemini:streamGenerateContent?alt=sse']) {
    assert.equal(buildModelCatalogRequest({ ...provider, baseUrl: `https://api.example.com${path}`, apiFormat: 'google-generative-ai' }).url, 'https://api.example.com/prefix/v1beta/models');
  }
});

test('local native protocols send bearer credentials and accept OpenAI catalogs', async () => {
  for (const apiFormat of ['anthropic', 'google-generative-ai']) {
    const handler = createAiModelsHandler((async (url, init) => {
      assert.equal(String(url), `http://127.0.0.1:8317/${apiFormat === 'anthropic' ? 'v1' : 'v1beta'}/models`);
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers.Authorization, 'Bearer test-key');
      assert.equal(headers[apiFormat === 'anthropic' ? 'x-api-key' : 'x-goog-api-key'], 'test-key');
      return json({ data: [{ id: 'proxy-model' }] });
    }) as typeof fetch);
    const response = await handler({ provider: { ...provider, baseUrl: 'http://127.0.0.1:8317', apiFormat } }, { allowPrivateHosts: true });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { models: ['proxy-model'] });
  }
});

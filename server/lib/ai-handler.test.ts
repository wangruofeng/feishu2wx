import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUpstreamRequest, createAiChatHandler, extractUpstreamEvents, parseAiChatBody, resolveUpstreamUrl, validateProvider, type AiApiFormat } from './ai-handler';

const attachments = [{ name: 'article.md', content: '# 附件标题\n\n正文' }];
const image = { mimeType: 'image/png', data: 'aW1hZ2U=' };

function getUserContent(apiFormat: AiApiFormat, withImage = false): unknown {
  const request = buildUpstreamRequest({
    provider: { baseUrl: 'https://api.example.com', apiKey: 'key', apiFormat },
    modelId: 'test-model',
    systemPrompt: 'system',
    messages: [{
      role: 'user',
      content: '请阅读附件。',
      attachments,
      images: withImage ? [image] : [],
    }],
  });
  const body = JSON.parse(request.bodyJson);
  if (apiFormat === 'anthropic') return body.messages[0].content;
  if (apiFormat === 'responses') return body.input[0].content;
  return body.messages[1].content;
}

for (const apiFormat of ['chat-completions', 'anthropic', 'responses'] as const) {
  test(`${apiFormat} sends a text attachment as a string`, () => {
    const content = getUserContent(apiFormat);
    assert.equal(typeof content, 'string');
    assert.match(content as string, /【附件：article\.md】/);
    assert.match(content as string, /# 附件标题/);
  });

  test(`${apiFormat} keeps text attachments when an image is present`, () => {
    const content = getUserContent(apiFormat, true);
    assert.ok(Array.isArray(content));
    const textPart = content.find((part: any) => part.type === 'text' || part.type === 'input_text');
    assert.ok(textPart);
    assert.match(textPart.text, /【附件：article\.md】/);
    assert.match(textPart.text, /# 附件标题/);
  });
}

test('keeps text attachments from earlier user messages in the active conversation', () => {
  const parsed = parseAiChatBody({
    source: '# 当前文章',
    provider: { baseUrl: 'https://api.example.com', apiKey: 'key', apiFormat: 'chat-completions' },
    modelId: 'test-model',
    messages: [
      { role: 'user', content: '请阅读第一个附件。', attachments },
      { role: 'assistant', content: '我已经读完。' },
      { role: 'user', content: '现在总结一下。' },
    ],
  });
  assert.ok(!('error' in parsed));
  if ('error' in parsed) return;
  const request = buildUpstreamRequest({
    provider: parsed.body.provider,
    modelId: parsed.body.modelId,
    systemPrompt: 'system',
    messages: parsed.body.messages,
  });
  const body = JSON.parse(request.bodyJson);
  assert.match(body.messages[1].content, /【附件：article\.md】/);
});

test('Google builds its model endpoint and preserves full endpoint query parameters', () => {
  assert.equal(resolveUpstreamUrl('https://generativelanguage.googleapis.com', 'google-generative-ai', 'models/gemini-test'), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:streamGenerateContent?alt=sse');
  assert.equal(resolveUpstreamUrl('https://proxy.example.com/google/v1', 'google-generative-ai', 'gemini-test'), 'https://proxy.example.com/google/v1/models/gemini-test:streamGenerateContent?alt=sse');
  assert.equal(resolveUpstreamUrl('https://proxy.example.com/v1beta/models/old:streamGenerateContent?custom=1', 'google-generative-ai', 'gemini-test'), 'https://proxy.example.com/v1beta/models/gemini-test:streamGenerateContent?custom=1&alt=sse');
  assert.equal(resolveUpstreamUrl('https://proxy.example.com/v1beta/models/old:streamGenerateContent/?custom=1', 'google-generative-ai', 'gemini-test'), 'https://proxy.example.com/v1beta/models/gemini-test:streamGenerateContent?custom=1&alt=sse');
});

test('Anthropic accepts the API root, version root and complete endpoint', () => {
  for (const base of ['https://api.anthropic.com', 'https://api.anthropic.com/v1', 'https://api.anthropic.com/v1/messages']) {
    assert.equal(resolveUpstreamUrl(base, 'anthropic'), 'https://api.anthropic.com/v1/messages');
  }
});

test('provider validation rejects embedded credentials and private literal addresses', () => {
  for (const baseUrl of [
    'https://user:secret@api.example.com', 'https://localhost./', 'https://127.1/', 'https://2130706433/',
    'https://10.1.2.3', 'https://172.16.0.1', 'https://172.31.255.255', 'https://192.168.0.1', 'https://169.254.1.1',
    'https://0.0.0.0', 'https://100.64.0.1', 'https://[::1]', 'https://[::]', 'https://[fc00::1]', 'https://[fe80::1]',
    'https://[::ffff:127.0.0.1]', 'https://[::ffff:192.168.0.1]',
  ]) assert.ok('error' in validateProvider({ baseUrl, apiKey: 'key' }), baseUrl);
  for (const baseUrl of ['https://api.example.com', 'https://172.32.0.1', 'https://8.8.8.8', 'https://[2606:4700:4700::1111]']) {
    assert.ok('provider' in validateProvider({ baseUrl, apiKey: 'key' }), baseUrl);
  }
});

test('Google sends system instructions, model roles, inline images and text attachments', () => {
  const request = buildUpstreamRequest({
    provider: { baseUrl: 'https://generativelanguage.googleapis.com', apiKey: 'google-key', apiFormat: 'google-generative-ai' },
    modelId: 'gemini-test', systemPrompt: 'system',
    messages: [{ role: 'assistant', content: 'previous' }, { role: 'user', content: 'read', attachments, images: [image] }],
  });
  const body = JSON.parse(request.bodyJson);
  assert.equal(request.headers['x-goog-api-key'], 'google-key');
  assert.equal(request.headers.Authorization, undefined);
  assert.deepEqual(body.systemInstruction, { parts: [{ text: 'system' }] });
  assert.deepEqual(body.contents[0], { role: 'model', parts: [{ text: 'previous' }] });
  assert.equal(body.contents[1].role, 'user');
  assert.match(body.contents[1].parts[0].text, /【附件：article\.md】/);
  assert.deepEqual(body.contents[1].parts[1], { inlineData: image });
  assert.equal(body.stream, undefined);
});

test('Chat Completions requests upstream usage', () => {
  const request = buildUpstreamRequest({ provider: { baseUrl: 'https://api.example.com', apiKey: 'key' }, modelId: 'test', systemPrompt: 'system', messages: [{ role: 'user', content: 'hi' }] });
  assert.deepEqual(JSON.parse(request.bodyJson).stream_options, { include_usage: true });
});

test('Google-compatible gateways also receive bearer authentication used by their model catalogs', () => {
  const request = buildUpstreamRequest({
    provider: { baseUrl: 'https://proxy.example.com/v1beta', apiKey: 'gateway-key', apiFormat: 'google-generative-ai' },
    modelId: 'gemini-test', systemPrompt: 'system', messages: [{ role: 'user', content: 'hello' }],
  });
  assert.equal(request.headers.Authorization, 'Bearer gateway-key');
  assert.equal(request.headers['x-goog-api-key'], 'gateway-key');
});

test('Google separates thought parts from answer text and reports safety refusals', () => {
  assert.deepEqual(extractUpstreamEvents({ candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: 'answer' }] } }] }, 'google-generative-ai'), [{ type: 'reasoning', text: 'thinking' }, { type: 'delta', text: 'answer' }]);
  assert.match(extractUpstreamEvents({ promptFeedback: { blockReason: 'SAFETY' } }, 'google-generative-ai')[0].message!, /SAFETY/);
  assert.match(extractUpstreamEvents({ candidates: [{ finishReason: 'PROHIBITED_CONTENT' }] }, 'google-generative-ai')[0].message!, /PROHIBITED_CONTENT/);
  assert.deepEqual(extractUpstreamEvents({ error: { message: 'Invalid API key' } }, 'google-generative-ai'), [{ type: 'error', message: 'Invalid API key' }]);
});

async function normalizedEvents(apiFormat: AiApiFormat, payloads: unknown[], trailingNewline = true) {
  const lines = payloads.map(payload => `data: ${JSON.stringify(payload)}`).join('\r\n\r\n') + (trailingNewline ? '\r\n\r\n' : '');
  let redirect: RequestInit['redirect'];
  const handler = createAiChatHandler({ fetchUpstream: (async (_url: unknown, init: RequestInit) => {
    redirect = init.redirect;
    // Split inside multibyte text and across SSE lines to exercise incremental decoding.
    const bytes = new TextEncoder().encode(lines);
    return new Response(new ReadableStream({ start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7));
      controller.close();
    } }));
  }) as typeof fetch });
  const response = await handler({ source: '# current', provider: { baseUrl: 'https://api.example.com', apiKey: 'key', apiFormat }, modelId: 'test', messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(response.status, 200);
  assert.equal(redirect, 'manual');
  return (await response.text()).trim().split('\n\n').map(line => JSON.parse(line.slice(6)));
}

test('normalizes Google SSE text and usage even when the last event has no newline', async () => {
  const payload = { usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3, thoughtsTokenCount: 2, totalTokenCount: 15 } };
  const events = await normalizedEvents('google-generative-ai', [
    { candidates: [{ content: { parts: [{ thought: true, text: '思考' }, { text: '正文' }] } }] }, payload, payload,
    { usageMetadata: { candidatesTokenCount: 1 } },
  ], false);
  assert.deepEqual(events, [
    { type: 'reasoning', text: '思考' }, { type: 'delta', text: '正文' },
    { type: 'usage', usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, reasoningTokens: 2 } },
  ]);
});

for (const [format, payloads, usage] of [
  ['chat-completions', [{ choices: [{ delta: { content: 'answer' } }] }, { usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } }], { inputTokens: 10, outputTokens: 2, totalTokens: 12 }],
  ['responses', [{ type: 'response.output_text.delta', delta: 'answer' }, { type: 'response.completed', response: { usage: { input_tokens: 10, output_tokens: 2 } } }], { inputTokens: 10, outputTokens: 2 }],
  ['anthropic', [{ type: 'message_start', message: { usage: { input_tokens: 10, cache_read_input_tokens: 5 } } }, { type: 'content_block_delta', delta: { type: 'text_delta', text: 'answer' } }, { type: 'message_delta', usage: { output_tokens: 2 } }], { inputTokens: 15, outputTokens: 2, cacheReadTokens: 5 }],
] as const) {
  test(`${format} normalizes upstream usage in a real SSE response`, async () => {
    const events = await normalizedEvents(format, [...payloads], false);
    assert.deepEqual(events.filter(event => event.type === 'delta'), [{ type: 'delta', text: 'answer' }]);
    const usageEvents = events.filter(event => event.type === 'usage');
    assert.deepEqual(usageEvents[usageEvents.length - 1].usage, usage);
    assert.ok(!events.some(event => event.type === 'error'));
  });
}

test('usage without generated text still reports an empty response', async () => {
  const events = await normalizedEvents('chat-completions', [{ usage: { prompt_tokens: 10, completion_tokens: 0 } }], false);
  assert.equal(events[0].type, 'usage');
  assert.equal(events[1].type, 'error');
  assert.match(events[1].message, /没有返回文本/);
});

test('reasoning and usage without answer text still reports an empty response', async () => {
  const events = await normalizedEvents('google-generative-ai', [
    { candidates: [{ content: { parts: [{ text: '思考中', thought: true }] } }] },
    { usageMetadata: { promptTokenCount: 10, thoughtsTokenCount: 5 } },
  ]);
  assert.equal(events[0].type, 'reasoning');
  assert.equal(events[1].type, 'usage');
  assert.equal(events[2].type, 'error');
  assert.match(events[2].message, /没有返回文本/);
});

test('a mismatched declared format keeps the actual Anthropic cumulative usage', async () => {
  const events = await normalizedEvents('chat-completions', [
    { type: 'message_start', message: { usage: { input_tokens: 10, cache_read_input_tokens: 20 } } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text: 'answer' } },
    { type: 'message_delta', usage: { output_tokens: 5 } },
    { usage: { output_tokens: 3 } },
  ], false);
  assert.deepEqual(events.filter(event => event.type === 'usage'), [
    { type: 'usage', usage: { inputTokens: 30, cacheReadTokens: 20 } },
    { type: 'usage', usage: { inputTokens: 30, outputTokens: 5, cacheReadTokens: 20 } },
  ]);
});

test('mismatched Google and Responses envelopes select their own usage protocol', async () => {
  const googleEvents = await normalizedEvents('responses', [{
    candidates: [{ content: { parts: [{ text: 'answer' }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2, totalTokenCount: 17 },
  }]);
  assert.deepEqual(googleEvents, [{ type: 'delta', text: 'answer' }, { type: 'usage', usage: { inputTokens: 10, outputTokens: 7, totalTokens: 17, reasoningTokens: 2 } }]);
  const responseEvents = await normalizedEvents('anthropic', [
    { type: 'response.output_text.delta', delta: 'answer' },
    { type: 'response.completed', response: { usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } } },
  ]);
  assert.deepEqual(responseEvents, [{ type: 'delta', text: 'answer' }, { type: 'usage', usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } }]);
});

test('Google-declared gateways preserve Chat Completions terminal usage without double counting', async () => {
  const events = await normalizedEvents('google-generative-ai', [
    { choices: [{ delta: { content: 'answer' } }], usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 } },
    { usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
    { usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
  ], false);
  assert.deepEqual(events, [
    { type: 'delta', text: 'answer' },
    { type: 'usage', usage: { inputTokens: 100, outputTokens: 5, totalTokens: 105 } },
    { type: 'usage', usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 } },
  ]);
});

test('local development allows private Base URLs but keeps other provider validation', () => {
  for (const baseUrl of ['http://localhost:11434/v1', 'http://127.0.0.1:11434', 'http://192.168.1.2/v1', 'http://[::1]:11434']) {
    const body = { source: '# Article', provider: { baseUrl, apiKey: 'key' }, modelId: 'local', messages: [{ role: 'user', content: 'edit' }] };
    assert.ok('error' in parseAiChatBody(body));
    assert.ok('body' in parseAiChatBody(body, { allowPrivateHosts: true }));
    assert.ok('error' in parseAiChatBody({ ...body, allowPrivateHosts: true }));
  }
  for (const baseUrl of ['file:///tmp/model', 'http://user:secret@localhost']) {
    assert.ok('error' in validateProvider({ baseUrl, apiKey: 'key' }, { allowPrivateHosts: true }));
  }
});

test('local OpenAI-compatible chat resolves root, version root and full endpoints consistently', async () => {
  for (const apiFormat of ['chat-completions', 'responses'] as const) {
    const suffix = apiFormat === 'responses' ? 'responses' : 'chat/completions';
    for (const origin of ['http://localhost:8317', 'http://127.0.0.1:8317', 'http://[::1]:8317']) {
      for (const path of ['', '/', '/v1', `/v1/${suffix}/`]) {
        const expected = `${origin}/v1/${suffix}`;
        assert.equal(resolveUpstreamUrl(origin + path, apiFormat), expected);
        let called = false;
        const handler = createAiChatHandler({ fetchUpstream: (async (url, init) => {
          called = true;
          assert.equal(String(url), expected);
          assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer local-key');
          assert.equal(JSON.parse(String(init?.body)).model, 'local-model');
          const payload = apiFormat === 'responses'
            ? { type: 'response.output_text.delta', delta: 'ok' }
            : { choices: [{ delta: { content: 'ok' } }] };
          return new Response(`data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
        }) as typeof fetch });
        const response = await handler({ source: '# Article', provider: { baseUrl: origin + path, apiKey: 'local-key', apiFormat }, modelId: 'local-model', messages: [{ role: 'user', content: 'hello' }] }, { allowPrivateHosts: true });
        assert.equal(response.status, 200);
        assert.match(await response.text(), /"text":"ok"/);
        assert.equal(called, true);
      }
    }
  }
  assert.equal(resolveUpstreamUrl('https://proxy.example.com', 'responses'), 'https://proxy.example.com/responses');
  assert.equal(resolveUpstreamUrl('http://localhost:8317/custom/v1', 'responses'), 'http://localhost:8317/custom/v1/responses');
});

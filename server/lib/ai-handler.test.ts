import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUpstreamRequest, parseAiChatBody, type AiApiFormat } from './ai-handler';

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

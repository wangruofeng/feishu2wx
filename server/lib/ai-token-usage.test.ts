import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTokenUsage, TokenUsageAccumulator } from './ai-token-usage';

test('OpenAI caches and reasoning are subsets of its reported input and output', () => {
  assert.deepEqual(parseTokenUsage({ usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 129, prompt_tokens_details: { cached_tokens: 60, cache_write_tokens: 4 }, completion_tokens_details: { reasoning_tokens: 20 } } }, 'chat-completions'), { inputTokens: 100, outputTokens: 30, totalTokens: 129, cacheReadTokens: 60, cacheWriteTokens: 4, reasoningTokens: 20 });
});

for (const type of ['response.completed', 'response.incomplete', 'response.failed']) {
  test(`Responses ${type} reads response usage`, () => {
    assert.deepEqual(parseTokenUsage({ type, response: { usage: { input_tokens: 70, output_tokens: 10, input_tokens_details: { cached_tokens: 40, cache_write_tokens: 3 }, output_tokens_details: { reasoning_tokens: 6 } } } }, 'responses'), { inputTokens: 70, outputTokens: 10, cacheReadTokens: 40, cacheWriteTokens: 3, reasoningTokens: 6 });
  });
}

test('Anthropic combines input, cache reads and cache writes across cumulative events', () => {
  const parser = new TokenUsageAccumulator('anthropic');
  assert.deepEqual(parser.inspect({ type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 0, cache_creation_input_tokens: 20, cache_read_input_tokens: 50 } } }), { inputTokens: 80, outputTokens: 0, cacheReadTokens: 50, cacheWriteTokens: 20 });
  assert.deepEqual(parser.inspect({ type: 'message_delta', usage: { output_tokens: 12 } }), { inputTokens: 80, outputTokens: 12, cacheReadTokens: 50, cacheWriteTokens: 20 });
  assert.equal(parser.inspect({ usage: { output_tokens: 12 } }), undefined);
  assert.equal(parser.inspect({ usage: { output_tokens: 8 } }), undefined);
});

test('Anthropic preserves an explicitly supplied upstream total without deriving one', () => {
  assert.deepEqual(parseTokenUsage({ usage: { input_tokens: 10, output_tokens: 2, total_tokens: 14 } }, 'anthropic'), { inputTokens: 10, outputTokens: 2, totalTokens: 14 });
});

test('Google combines candidates and thoughts while preserving the upstream total', () => {
  const parser = new TokenUsageAccumulator('google-generative-ai');
  assert.deepEqual(parser.inspect({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, cachedContentTokenCount: 80 } }), { inputTokens: 100, outputTokens: 20, cacheReadTokens: 80 });
  assert.deepEqual(parser.inspect({ usageMetadata: { thoughtsTokenCount: 30, totalTokenCount: 145 } }), { inputTokens: 100, outputTokens: 50, cacheReadTokens: 80, reasoningTokens: 30, totalTokens: 145 });
});

test('out of order snapshots never accumulate and new fields can complete a snapshot', () => {
  const parser = new TokenUsageAccumulator('chat-completions');
  assert.deepEqual(parser.inspect({ usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } }), { inputTokens: 100, outputTokens: 20, totalTokens: 120 });
  assert.equal(parser.inspect({ usage: { prompt_tokens: 80, completion_tokens: 10, total_tokens: 90 } }), undefined);
  assert.deepEqual(parser.inspect({ usage: { completion_tokens: 10, prompt_tokens_details: { cached_tokens: 30 } } }), { inputTokens: 100, outputTokens: 20, totalTokens: 120, cacheReadTokens: 30 });
});

test('missing counts stay unknown, valid zero is retained and invalid counts are ignored', () => {
  assert.deepEqual(parseTokenUsage({ usage: { completion_tokens: 0 } }, 'chat-completions'), { outputTokens: 0 });
  assert.deepEqual(parseTokenUsage({ usage: { total_tokens: 10 } }, 'chat-completions'), { totalTokens: 10 });
  for (const value of [-1, 1.5, Infinity, NaN, '12', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseTokenUsage({ usage: { prompt_tokens: value, completion_tokens: value, total_tokens: value } }, 'chat-completions'), undefined);
  }
});

test('derived counts cannot overflow safe integers', () => {
  assert.deepEqual(parseTokenUsage({ usage: { input_tokens: Number.MAX_SAFE_INTEGER, cache_read_input_tokens: 1 } }, 'anthropic'), { cacheReadTokens: 1 });
});

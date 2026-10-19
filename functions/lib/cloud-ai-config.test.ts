import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeConfig } from './cloud-ai-config';

test('keeps a newly added incomplete provider so a signed-in user can finish configuring it', () => {
  const merged = mergeConfig(
    { activeProviderId: null, activeModelId: null, providers: [] },
    {
      activeProviderId: 'new-provider',
      activeModelId: null,
      providers: [{
        id: 'new-provider',
        name: '',
        enabled: true,
        baseUrl: '',
        apiFormat: 'chat-completions',
        apiKey: '',
        models: [],
      }],
    },
  );

  assert.equal(merged.providers.length, 1);
  assert.equal(merged.providers[0].id, 'new-provider');
  assert.equal(merged.activeProviderId, 'new-provider');
});

test('keeps Google protocol, discovered model catalogs and an existing encrypted key during metadata-only updates', () => {
  const provider = { id: 'google', name: 'Google', enabled: true, baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiFormat: 'google-generative-ai' as const, apiKey: 'saved-key', models: [{ id: 'old' }] };
  const existing = { activeProviderId: 'google', activeModelId: 'm99', providers: [provider] };
  const merged = mergeConfig(existing, { ...existing, providers: [{ ...provider, apiKey: '', models: Array.from({ length: 100 }, (_, n) => ({ id: `m${n}` })) }] });
  assert.equal(merged.providers[0].apiFormat, 'google-generative-ai');
  assert.equal(merged.providers[0].apiKey, 'saved-key');
  assert.equal(merged.providers[0].models.length, 100);
});

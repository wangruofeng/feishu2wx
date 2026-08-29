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

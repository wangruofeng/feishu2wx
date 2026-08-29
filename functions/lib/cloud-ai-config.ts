import { decryptConfig, encryptConfig, type EncryptedValue } from './auth-crypto';
import type { PagesAuthEnv } from './auth';

export interface CloudProvider { id: string; name: string; enabled: boolean; baseUrl: string; apiFormat: 'anthropic' | 'chat-completions' | 'responses'; apiKey: string; models: { id: string }[]; }
export interface CloudConfig { activeProviderId: string | null; activeModelId: string | null; providers: CloudProvider[]; }
const keyFor = (userId: string) => `ai-config:v1:${userId}`;

export async function loadCloudConfig(userId: string, env: PagesAuthEnv): Promise<CloudConfig> {
  const raw = await env.AI_CONFIGS_KV.get(keyFor(userId));
  if (!raw) return { activeProviderId: null, activeModelId: null, providers: [] };
  return JSON.parse(await decryptConfig(JSON.parse(raw) as EncryptedValue, userId, env)) as CloudConfig;
}

export async function saveCloudConfig(userId: string, config: CloudConfig, env: PagesAuthEnv): Promise<void> {
  await env.AI_CONFIGS_KV.put(keyFor(userId), JSON.stringify(await encryptConfig(JSON.stringify(config), userId, env)));
}

export function withoutKeys(config: CloudConfig) {
  return { ...config, providers: config.providers.map(({ apiKey, ...provider }) => ({ ...provider, hasApiKey: Boolean(apiKey) })) };
}

export function mergeConfig(existing: CloudConfig, incoming: CloudConfig): CloudConfig {
  const oldKeys = new Map(existing.providers.map((provider) => [provider.id, provider.apiKey]));
  const providers = incoming.providers.slice(0, 20).map((provider) => ({
    ...provider,
    id: String(provider.id ?? '').slice(0, 80), name: String(provider.name ?? '').slice(0, 120), baseUrl: String(provider.baseUrl ?? '').slice(0, 500),
    apiKey: String(provider.apiKey ?? '') || oldKeys.get(provider.id) || '', models: Array.isArray(provider.models) ? provider.models.slice(0, 30).map((model) => ({ id: String(model?.id ?? '').slice(0, 160) })) : [],
  })).filter((provider) => provider.id && provider.baseUrl);
  return { activeProviderId: providers.some((provider) => provider.id === incoming.activeProviderId) ? incoming.activeProviderId : providers[0]?.id ?? null, activeModelId: String(incoming.activeModelId ?? '') || null, providers };
}

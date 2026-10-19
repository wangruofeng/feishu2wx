import { newAiId, normalizeProviderSettings } from './aiChat';
import type { AiProvider, AiProviderSettings } from './aiChat';

export const AI_PROVIDER_CONFIG_MAX_BYTES = 1024 * 1024;
export const AI_PROVIDER_LIMIT = 20;
export const AI_PROVIDER_MODEL_LIMIT = 1000;
export type AiProviderImportMode = 'append' | 'replace';
const FORMATS = new Set(['chat-completions', 'anthropic', 'responses', 'google-generative-ai']);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** 只导出浏览器已有的密钥，不携带云端密钥标记。 */
export function exportAiProviderConfig(settings: AiProviderSettings): string {
  return JSON.stringify({
    type: 'feishu2wx-model-settings', version: 1,
    activeProviderId: settings.activeProviderId, activeModelId: settings.activeModelId,
    providers: settings.providers.map(({ id, name, enabled, baseUrl, apiFormat, apiKey, models }) => ({
      id, name, enabled, baseUrl, apiFormat, apiKey, models,
    })),
  }, null, 2);
}

/** 整份校验后才返回配置；重新生成 ID，追加时不会覆盖已有供应商或其云端密钥。 */
export function importAiProviderConfig(source: string): AiProviderSettings {
  let data: unknown;
  try { data = JSON.parse(source.replace(/^\uFEFF/, '')); }
  catch { throw new Error('文件不是有效的 JSON，请选择导出的模型配置文件。'); }
  if (!isRecord(data) || !['feishu2wx-model-settings', 'asksail-model-settings'].includes(String(data.type)) || data.version !== 1 || !Array.isArray(data.providers)) {
    throw new Error('不支持此配置格式或版本，请选择本项目或 A2Make 导出的 v1 模型配置。');
  }
  if (!data.providers.length) throw new Error('配置文件中没有供应商。');
  if (data.providers.length > AI_PROVIDER_LIMIT) throw new Error('最多支持 20 个供应商，请减少后重新导入。');
  if (data.activeProviderId !== undefined && data.activeProviderId !== null && typeof data.activeProviderId !== 'string') throw new Error('当前供应商配置无效。');
  if (data.activeModelId !== undefined && data.activeModelId !== null && typeof data.activeModelId !== 'string') throw new Error('当前模型配置无效。');
  const ids = new Map<string, string>();
  const providers: AiProvider[] = data.providers.map((entry, index) => {
    const fail = (): never => { throw new Error(`第 ${index + 1} 个供应商配置无效，请检查名称、地址、密钥及模型列表。`); };
    if (!isRecord(entry)) return fail();
    if (!FORMATS.has(String(entry.apiFormat))) throw new Error(`第 ${index + 1} 个供应商使用不支持的协议，仅支持四种聊天协议。`);
    if (typeof entry.name !== 'string' || typeof entry.baseUrl !== 'string' || typeof entry.apiKey !== 'string' || !Array.isArray(entry.models)
      || (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') || (entry.id !== undefined && typeof entry.id !== 'string')) return fail();
    if (entry.models.length > AI_PROVIDER_MODEL_LIMIT) throw new Error(`第 ${index + 1} 个供应商的模型数量超过 1000 个，请减少后重新导入。`);
    if (entry.baseUrl.trim()) {
      try { if (!['https:', 'http:'].includes(new URL(entry.baseUrl.trim()).protocol)) return fail(); }
      catch { return fail(); }
    }
    const models = entry.models.map((model: unknown) => {
      if (typeof model === 'string') return model.trim();
      if (isRecord(model) && typeof model.id === 'string') return model.id.trim();
      return fail();
    });
    const id = newAiId();
    if (typeof entry.id === 'string' && entry.id) {
      if (ids.has(entry.id)) return fail();
      ids.set(entry.id, id);
    }
    return {
      id, name: entry.name.trim(), baseUrl: entry.baseUrl.trim(), apiKey: entry.apiKey,
      enabled: entry.enabled !== false, apiFormat: entry.apiFormat as AiProvider['apiFormat'],
      models: Array.from(new Set(models.filter(Boolean))).map((modelId) => ({ id: modelId })),
    };
  });
  return normalizeProviderSettings({
    providers, activeProviderId: typeof data.activeProviderId === 'string' ? ids.get(data.activeProviderId) ?? null : null,
    activeModelId: typeof data.activeModelId === 'string' ? data.activeModelId : null,
  });
}

export function applyAiProviderImport(current: AiProviderSettings, imported: AiProviderSettings, mode: AiProviderImportMode): AiProviderSettings {
  if (mode === 'append' && current.providers.length + imported.providers.length > AI_PROVIDER_LIMIT) throw new Error('新增后供应商将超过 20 个，请减少配置或选择完全覆盖。');
  return mode === 'replace' ? imported : normalizeProviderSettings({
    ...current, providers: [...current.providers, ...imported.providers],
  });
}

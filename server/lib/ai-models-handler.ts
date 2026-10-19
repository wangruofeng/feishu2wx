import { inferApiFormat, isLoopbackUpstream, resolveUpstreamUrl, validateProvider, type AiApiFormat, type AiProviderConfig } from './ai-handler';
import { jsonResponse } from './config-handlers';

const MAX_PAGES = 20;
const MAX_MODELS = 1000;

function catalogFormat(provider: AiProviderConfig): AiApiFormat {
  const host = new URL(provider.baseUrl).hostname;
  return ['api.deepseek.com', 'api.xiaomimimo.com'].includes(host)
    ? 'chat-completions' : inferApiFormat(provider.baseUrl, provider.apiFormat);
}

export function buildModelCatalogRequest(provider: AiProviderConfig, pageToken?: string) {
  const format = catalogFormat(provider);
  const url = new URL(provider.baseUrl);
  if (url.hostname === 'api.deepseek.com') url.pathname = '/models';
  else if (url.hostname === 'api.xiaomimimo.com') url.pathname = '/v1/models';
  else if (format === 'google-generative-ai') {
    const root = url.pathname.replace(/\/+$/, '').replace(/\/models(?:\/[^/]+(?::(?:streamGenerateContent|generateContent))?)?$/, '') || '/v1beta';
    url.pathname = `${root}/models`;
  } else {
    const resolved = new URL(resolveUpstreamUrl(provider.baseUrl, format));
    url.pathname = resolved.pathname.replace(/\/(?:chat\/completions|responses|messages)$/, '/models');
  }
  url.search = '';
  url.hash = '';
  if (pageToken) url.searchParams.set(format === 'google-generative-ai' ? 'pageToken' : 'after_id', pageToken);
  const headers: Record<string, string> = format === 'google-generative-ai'
    ? { 'x-goog-api-key': provider.apiKey }
    : format === 'anthropic'
      ? { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' }
      : { Authorization: `Bearer ${provider.apiKey}` };
  if (isLoopbackUpstream(provider.baseUrl) && ['anthropic', 'google-generative-ai'].includes(format)) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }
  return { url: url.toString(), headers, format };
}

export function createAiModelsHandler(fetchUpstream: typeof fetch = globalThis.fetch.bind(globalThis)) {
  return async (raw: unknown, opts: { signal?: AbortSignal; allowPrivateHosts?: boolean } = {}): Promise<Response> => {
    const parsed = validateProvider((raw as { provider?: unknown } | null)?.provider, opts);
    if ('error' in parsed) return jsonResponse({ error: parsed.error }, 400);
    const { provider } = parsed;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (opts.signal?.aborted) abort();
    opts.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20_000);
    try {
      const models = new Set<string>();
      const seenTokens = new Set<string>();
      let pageToken: string | undefined;
      let bearer = false;
      for (let page = 0; page < MAX_PAGES; page++) {
        const request = buildModelCatalogRequest(provider, pageToken);
        const init = { signal: controller.signal, redirect: 'manual' as const };
        let response = await fetchUpstream(request.url, { ...init, headers: bearer ? { Authorization: `Bearer ${provider.apiKey}` } : request.headers });
        const googleProxy = request.format === 'google-generative-ai' && new URL(provider.baseUrl).hostname !== 'generativelanguage.googleapis.com';
        if (googleProxy && !bearer && !pageToken && [400, 401, 403, 404, 405].includes(response.status)) {
          await response.body?.cancel();
          bearer = true;
          response = await fetchUpstream(request.url, { ...init, headers: { Authorization: `Bearer ${provider.apiKey}` } });
        }
        if (!response.ok) {
          await response.body?.cancel();
          const hint = [401, 403].includes(response.status) ? '请检查 API Key 和访问权限。'
            : response.status === 429 ? '请求受限，请稍后重试。' : '请确认 Base URL、协议及供应商是否支持模型目录。';
          return jsonResponse({ error: `模型目录接口返回 ${response.status}。${hint}` }, 502);
        }
        const payload = await response.json() as any;
        const compatibleCatalog = googleProxy || isLoopbackUpstream(provider.baseUrl);
        const format = compatibleCatalog && !Array.isArray(payload.models) && Array.isArray(payload.data) ? 'chat-completions' : request.format;
        const entries = format === 'google-generative-ai' ? payload.models : payload.data;
        if (!Array.isArray(entries)) throw new Error('模型目录格式无效，该供应商可能不支持模型列表接口。');
        for (const entry of entries) {
          if (format === 'google-generative-ai' && Array.isArray(entry?.supportedGenerationMethods)
            && !entry.supportedGenerationMethods.includes('generateContent')) continue;
          const id = format === 'google-generative-ai' ? entry?.name : entry?.id;
          if (typeof id === 'string' && id.trim()) models.add(id.trim().replace(/^models\//, ''));
        }
        if (models.size > MAX_MODELS) throw new Error('模型目录超过 1000 项，请手动添加需要的模型。');
        if (format === 'anthropic' && payload.has_more && (typeof payload.last_id !== 'string' || !payload.last_id)) {
          throw new Error('模型目录分页异常，请手动添加模型。');
        }
        const next = format === 'google-generative-ai' ? payload.nextPageToken
          : format === 'anthropic' && payload.has_more ? payload.last_id : undefined;
        if (!next) return jsonResponse({ models: [...models].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true })) });
        if (typeof next !== 'string' || seenTokens.has(next)) throw new Error('模型目录分页异常，请手动添加模型。');
        pageToken = next;
        seenTokens.add(next);
      }
      throw new Error('模型目录分页过多，请手动添加模型。');
    } catch (error) {
      const message = controller.signal.aborted ? '模型目录请求已取消或超时，请重试。'
        : error instanceof SyntaxError ? '模型目录响应不是有效的 JSON。'
          : error instanceof Error && /模型目录/.test(error.message) ? error.message : '无法获取模型目录，请检查网络与供应商配置。';
      return jsonResponse({ error: message }, 502);
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', abort);
    }
  };
}

export const handleAiModels = createAiModelsHandler();

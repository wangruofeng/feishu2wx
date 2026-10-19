import { jsonResponse } from '../../server/lib/config-handlers';
import { getSession, type PagesAuthEnv } from './auth';
import { loadCloudConfig } from './cloud-ai-config';

export interface AiPagesContext {
  request: Request;
  env?: PagesAuthEnv & { ALLOWED_ORIGIN?: string; ALLOWED_ORIGINS?: string };
}

function originAllowed(context: AiPagesContext): boolean {
  const origin = context.request.headers.get('Origin');
  if (!origin) return true;
  const configured = context.env?.ALLOWED_ORIGINS || context.env?.ALLOWED_ORIGIN;
  const allowed = configured?.split(',').map(value => value.trim()).filter(Boolean);
  const origins = allowed?.length ? allowed : ['https://feishu2wx.wangruofeng007.com'];
  return origins.includes('*') || origins.includes(origin);
}

function withCors(response: Response, context: AiPagesContext): Response {
  const headers = new Headers(response.headers);
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Vary');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  const origin = context.request.headers.get('Origin');
  if (origin && originAllowed(context)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function aiRequestOptions(context: AiPagesContext): Response {
  return withCors(originAllowed(context) ? new Response(null, { status: 204 }) : jsonResponse({ error: '来源不被允许' }, 403), context);
}

/** 两个 AI 入口共用来源、大小和云端凭证校验，隐藏的密钥只在服务器使用。 */
export async function handleAiProviderRequest(
  context: AiPagesContext,
  handler: (body: unknown, opts: { signal: AbortSignal }) => Promise<Response>,
  maxBytes: number,
): Promise<Response> {
  const reply = (data: unknown, status: number) => withCors(jsonResponse(data, status), context);
  if (!originAllowed(context)) return reply({ error: '来源不被允许' }, 403);
  if (Number(context.request.headers.get('content-length')) > maxBytes) return reply({ error: '请求内容过大' }, 413);
  let body: Record<string, unknown>;
  try {
    const text = await context.request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) return reply({ error: '请求内容过大' }, 413);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body');
    body = parsed;
  } catch { return reply({ error: '请求格式无效' }, 400); }
  try {
    const session = await getSession(context.request, context.env as PagesAuthEnv);
    if (session) {
      const config = await loadCloudConfig(session.sub, context.env as PagesAuthEnv);
      const provider = config.providers.find(item => item.id === body.providerId && item.enabled);
      if (!provider) return reply({ error: '未找到可用的云端模型配置。' }, 400);
      body.provider = { baseUrl: provider.baseUrl, apiKey: provider.apiKey, apiFormat: provider.apiFormat };
    } else if (body.providerId) {
      return reply({ error: '请先登录 GitHub。' }, 401);
    }
    return withCors(await handler(body, { signal: context.request.signal }), context);
  } catch { return reply({ error: '无法读取 AI 配置，请稍后重试。' }, 503); }
}

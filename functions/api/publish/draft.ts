import { createPublishDraftHandler } from '../../../server/lib/publish-handler';
import { jsonResponse } from '../../../server/lib/config-handlers';
import * as wechat from '../../../server/lib/wechat-pages';

const handlePublishDraft = createPublishDraftHandler(wechat);
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const DEFAULT_ALLOWED_ORIGINS = [
  'https://feishu2wx.wangruofeng007.com',
  'https://wangruofeng.github.io',
];

type PagesContext = {
  request: Request;
  env?: {
    ALLOWED_ORIGIN?: string;
    ALLOWED_ORIGINS?: string;
  };
}

function getAllowedOrigins(context: PagesContext): string[] {
  const configured = context.env?.ALLOWED_ORIGINS || context.env?.ALLOWED_ORIGIN;
  const origins = configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function isOriginAllowed(context: PagesContext, origin: string): boolean {
  const allowedOrigins = getAllowedOrigins(context);
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

function getCorsHeaders(context: PagesContext) {
  const requestOrigin = context.request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (requestOrigin && isOriginAllowed(context, requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers.Vary = 'Origin';
  }

  return headers;
}

function withCorsHeaders(response: Response, context: PagesContext): Response {
  const headers = new Headers(response.headers);
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Vary');
  Object.entries(getCorsHeaders(context)).forEach(([key, value]) => headers.set(key, value));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isRequestTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get('content-length'));
  return Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES;
}

function isOriginForbidden(context: PagesContext): boolean {
  const requestOrigin = context.request.headers.get('Origin');
  return !!requestOrigin && !isOriginAllowed(context, requestOrigin);
}

function getForbiddenResponse(context: PagesContext): Response {
  return withCorsHeaders(jsonResponse({ error: '来源不被允许' }, 403), context);
}

export const onRequestOptions: PagesFunction = async (context) => {
  const pagesContext = context as PagesContext;
  if (isOriginForbidden(pagesContext)) return getForbiddenResponse(pagesContext);
  return new Response(null, { status: 204, headers: getCorsHeaders(pagesContext) });
};

export const onRequestPost: PagesFunction = async (context) => {
  const pagesContext = context as PagesContext;
  if (isOriginForbidden(pagesContext)) return getForbiddenResponse(pagesContext);
  if (isRequestTooLarge(pagesContext.request)) {
    return withCorsHeaders(jsonResponse({ error: '请求内容过大' }, 413), pagesContext);
  }

  try {
    const rawBody = await pagesContext.request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return withCorsHeaders(jsonResponse({ error: '请求内容过大' }, 413), pagesContext);
    }

    const body = JSON.parse(rawBody);
    const response = await handlePublishDraft(body as {
      title?: string;
      content?: string;
      author?: string;
      coverDataUrl?: string;
      appId?: string;
      appSecret?: string;
    });
    return withCorsHeaders(response, pagesContext);
  } catch {
    return withCorsHeaders(jsonResponse({ error: '请求格式无效' }, 400), pagesContext);
  }
};

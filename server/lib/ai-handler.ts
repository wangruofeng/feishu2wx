import { jsonResponse } from './config-handlers';

// AI 聊天代理：把浏览器请求转发到用户自带的多供应商 LLM API（BYOK），
// 上游 SSE 归一化为 {"type":"reasoning"|"delta"|"error"} 事件流。
// 供应商配置由前端 localStorage 持有并随请求体传入，服务端不存储任何 Key。

const MAX_HISTORY_MESSAGES = 20;
const UPSTREAM_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_AI_IMAGES = 6;
const MAX_IMAGE_BASE64_CHARS = 3.5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_AI_ATTACHMENTS = 6;
const MAX_ATTACHMENT_NAME_CHARS = 120;
const MAX_ATTACHMENT_CONTENT_CHARS = 100_000;
const MAX_ATTACHMENT_TOTAL_CHARS = 200_000;
// 阻止把上游指向内网/元数据地址（SSRF 防护）
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1', '169.254.169.254']);

export const ARTICLE_START_MARKER = '<<<ARTICLE';
export const ARTICLE_END_MARKER = 'ARTICLE>>>';

export type AiApiFormat = 'anthropic' | 'chat-completions' | 'responses';

export const AI_FORMATS: { id: AiApiFormat; label: string; path: string }[] = [
  { id: 'anthropic', label: 'Anthropic Messages (/v1/messages)', path: '/v1/messages' },
  { id: 'chat-completions', label: 'Chat Completions (/chat/completions)', path: '/chat/completions' },
  { id: 'responses', label: 'Responses (/responses)', path: '/responses' },
];

const FORMAT_IDS = new Set<string>(AI_FORMATS.map((format) => format.id));

export interface AiUpstreamImage {
  mimeType: string;
  data: string;
}

export interface AiUpstreamTextAttachment {
  name: string;
  content: string;
}

export interface AiUpstreamMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: AiUpstreamImage[];
  attachments?: AiUpstreamTextAttachment[];
}

export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  apiFormat?: string;
}

export interface AiChatRequestBody {
  source: string;
  messages: AiUpstreamMessage[];
  provider: AiProviderConfig;
  modelId: string;
}

export interface AiSseEvent {
  type: 'reasoning' | 'delta' | 'error';
  text?: string;
  message?: string;
}

export function resolveUpstreamUrl(baseUrl: string, apiFormat: AiApiFormat): string {
  const base = String(baseUrl ?? '').replace(/\/+$/, '');
  const format = AI_FORMATS.find((item) => item.id === apiFormat) ?? AI_FORMATS[1];
  if (!base) return format.path;
  if (base.endsWith(format.path)) return base;
  return `${base}${format.path}`;
}

export function inferApiFormat(baseUrl: string, apiFormat?: string): AiApiFormat {
  const url = String(baseUrl ?? '').toLowerCase();
  if (url.includes('/anthropic')) return 'anthropic';
  if (url.includes('/responses') && !url.includes('/chat/completions')) {
    return apiFormat === 'responses' ? 'responses' : (apiFormat as AiApiFormat);
  }
  return FORMAT_IDS.has(apiFormat ?? '') ? (apiFormat as AiApiFormat) : 'chat-completions';
}

export function buildUpstreamRequest({ provider, modelId, systemPrompt, messages }: {
  provider: AiProviderConfig;
  modelId: string;
  systemPrompt: string;
  messages: AiUpstreamMessage[];
}): { url: string; apiFormat: AiApiFormat; headers: Record<string, string>; bodyJson: string } {
  const apiFormat = inferApiFormat(provider.baseUrl, provider.apiFormat);
  const url = resolveUpstreamUrl(provider.baseUrl, apiFormat);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const formatted = messages.map((message) => ({
    role: message.role,
    content: message.role === 'user' && (message.images?.length || message.attachments?.length)
      ? toUpstreamUserContent(message.content, message.images ?? [], message.attachments ?? [], apiFormat)
      : message.content,
  }));

  let body: Record<string, unknown>;
  if (apiFormat === 'anthropic') {
    headers.Authorization = `Bearer ${provider.apiKey}`;
    headers['x-api-key'] = provider.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: modelId,
      max_tokens: 16384,
      temperature: 0.3,
      system: systemPrompt,
      messages: formatted,
      stream: true,
    };
  } else if (apiFormat === 'responses') {
    headers.Authorization = `Bearer ${provider.apiKey}`;
    body = {
      model: modelId,
      instructions: systemPrompt,
      input: formatted,
      stream: true,
      temperature: 0.3,
      max_output_tokens: 16384,
    };
  } else {
    headers.Authorization = `Bearer ${provider.apiKey}`;
    body = {
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }, ...formatted],
      stream: true,
      temperature: 0.3,
      max_tokens: 16384,
    };
  }
  return { url, apiFormat, headers, bodyJson: JSON.stringify(body) };
}

function extractFormatEvents(payload: any, apiFormat: AiApiFormat): AiSseEvent[] {
  if (apiFormat === 'anthropic') {
    if (payload.type !== 'content_block_delta' || !payload.delta) return [];
    if (payload.delta.type === 'thinking_delta' && payload.delta.thinking) {
      return [{ type: 'reasoning', text: payload.delta.thinking }];
    }
    if (payload.delta.type === 'text_delta' && payload.delta.text) {
      return [{ type: 'delta', text: payload.delta.text }];
    }
    return [];
  }

  if (apiFormat === 'responses') {
    const eventType = String(payload.type ?? '');
    const text = typeof payload.delta === 'string'
      ? payload.delta
      : typeof payload.text === 'string'
        ? payload.text
        : '';
    if (!text) return [];
    if (eventType.includes('reasoning')) return [{ type: 'reasoning', text }];
    if (eventType.includes('output_text')) return [{ type: 'delta', text }];
    return [];
  }

  const delta = payload.choices?.[0]?.delta;
  if (!delta) return [];
  const events: AiSseEvent[] = [];
  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
    events.push({ type: 'reasoning', text: delta.reasoning_content });
  }
  if (typeof delta.content === 'string' && delta.content) {
    events.push({ type: 'delta', text: delta.content });
  }
  return events;
}

export function extractUpstreamEvents(payload: any, apiFormat: AiApiFormat): AiSseEvent[] {
  if (!payload || typeof payload !== 'object') return [];
  const errorMessage = payload.error?.message ?? (typeof payload.error === 'string' ? payload.error : '');
  if (errorMessage) return [{ type: 'error', message: errorMessage }];

  const preferred: AiApiFormat = FORMAT_IDS.has(apiFormat) ? apiFormat : 'chat-completions';
  const events = extractFormatEvents(payload, preferred);
  if (events.length) return events;
  // 声明格式与实际不符时自动回退尝试其他两种
  for (const format of ['chat-completions', 'anthropic', 'responses'] as AiApiFormat[]) {
    if (format === preferred) continue;
    const fallback = extractFormatEvents(payload, format);
    if (fallback.length) return fallback;
  }
  return [];
}

export function buildAiSystemPrompt(source: string): string {
  return [
    '你是公众号文章排版工具 feishu2wx 中的 AI 写作助手，帮助用户修改正在编辑的微信公众号 Markdown 文章。',
    '',
    '输出规则：',
    '1. 用户的指令要求修改文章时，先用一两句话说明你做了什么修改，然后按以下格式输出修改后的完整文章源码：',
    ARTICLE_START_MARKER,
    '（修改后的完整文章源码：从文章第一行开始——若文章含 YAML frontmatter，则从第一行 --- 开始——到文件末尾结束）',
    ARTICLE_END_MARKER,
    '2. 文章源码必须完整，包含 frontmatter（如有）与全部正文，不能省略任何部分或用“…”代替。',
    '3. 未被要求修改的内容必须原样保留：frontmatter 字段、图片链接（http/https URL，不要改写或本地化）、代码块、链接与标点风格。',
    '4. 用户只是提问或讨论、不要求修改文章时，直接回答，不要输出 ARTICLE 标记。',
    '5. 用户可能附上图片或文本附件（文本附件内容以代码块形式附在指令后，标注【附件：文件名】），请结合其内容理解需求。',
    '6. 始终使用简体中文交流。',
    '',
    '当前文章源码：',
    ARTICLE_START_MARKER,
    source,
    ARTICLE_END_MARKER,
  ].join('\n');
}

export function normalizeAiImages(raw: unknown): AiUpstreamImage[] {
  if (!Array.isArray(raw)) return [];
  const images: AiUpstreamImage[] = [];
  for (const item of raw) {
    if (images.length >= MAX_AI_IMAGES) break;
    if (!item || typeof item !== 'object') continue;
    let mimeType = String((item as any).mimeType ?? '').trim().toLowerCase();
    let data = String((item as any).data ?? '').replace(/\s/g, '');
    const dataUrl = data.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (dataUrl) {
      mimeType = mimeType || dataUrl[1].toLowerCase();
      data = dataUrl[2];
    }
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    if (!ALLOWED_IMAGE_TYPES.has(mimeType) || !data || data.length > MAX_IMAGE_BASE64_CHARS) continue;
    images.push({ mimeType, data });
  }
  return images;
}

export function normalizeAiAttachments(raw: unknown): AiUpstreamTextAttachment[] {
  if (!Array.isArray(raw)) return [];
  const attachments: AiUpstreamTextAttachment[] = [];
  for (const item of raw) {
    if (attachments.length >= MAX_AI_ATTACHMENTS) break;
    if (!item || typeof item !== 'object') continue;
    const name = String((item as any).name ?? '')
      .replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, MAX_ATTACHMENT_NAME_CHARS);
    const content = typeof (item as any).content === 'string' ? (item as any).content : '';
    if (!name || !content.trim()) continue;
    attachments.push({
      name,
      content: content.slice(0, MAX_ATTACHMENT_CONTENT_CHARS),
    });
  }
  return attachments;
}

// 附件以「文件名 + 围栏代码块」拼进用户文本：不依赖模型多模态能力，三种 API 格式通用。
// 围栏长度取内容中最长反引号串 +1（至少 3），避免附件里的代码块截断外层围栏。
const ATTACHMENT_LANGUAGES: Record<string, string> = {
  md: 'markdown', markdown: 'markdown', json: 'json', csv: 'csv', tsv: 'csv',
  yaml: 'yaml', yml: 'yaml', xml: 'xml', html: 'html', htm: 'html', css: 'css',
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', java: 'java', go: 'go', rs: 'rust', sql: 'sql', sh: 'shell',
  log: 'text', toml: 'toml', ini: 'ini', txt: 'text',
};

export function buildAttachmentsBlock(attachments: AiUpstreamTextAttachment[]): string {
  const parts: string[] = [];
  let totalChars = 0;
  for (const attachment of attachments) {
    if (totalChars >= MAX_ATTACHMENT_TOTAL_CHARS) {
      parts.push('（附件过多，其余附件未包含。）');
      break;
    }
    let content = attachment.content;
    if (totalChars + content.length > MAX_ATTACHMENT_TOTAL_CHARS) {
      content = `${content.slice(0, MAX_ATTACHMENT_TOTAL_CHARS - totalChars)}\n…（内容过长，已截断）`;
    }
    totalChars += content.length;
    const extension = attachment.name.split('.').pop()?.toLowerCase() ?? '';
    const language = ATTACHMENT_LANGUAGES[extension] ?? 'text';
    const longestRun = (content.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
    const fence = '`'.repeat(Math.max(3, longestRun + 1));
    parts.push(`【附件：${attachment.name}】\n${fence}${language}\n${content}\n${fence}`);
  }
  return parts.join('\n\n');
}

export function toUpstreamUserContent(
  text: string,
  images: AiUpstreamImage[],
  attachments: AiUpstreamTextAttachment[],
  apiFormat: AiApiFormat
): string | unknown[] {
  const hasAttachments = attachments.length > 0;
  if (!images.length && !hasAttachments) return text;
  const fullText = hasAttachments ? `${text}\n\n${buildAttachmentsBlock(attachments)}` : text;
  // 文本附件本质是文本上下文。仅有文本时保持字符串，兼容只接受 string content 的
  // Chat Completions 兼容服务；只有图片需要各协议的多模态 content blocks。
  if (!images.length) return fullText;
  if (apiFormat === 'anthropic') {
    return [
      ...images.map((image) => ({
        type: 'image',
        source: { type: 'base64', media_type: image.mimeType, data: image.data },
      })),
      { type: 'text', text: fullText },
    ];
  }
  if (apiFormat === 'responses') {
    return [
      { type: 'input_text', text: fullText },
      ...images.map((image) => ({
        type: 'input_image',
        image_url: `data:${image.mimeType};base64,${image.data}`,
      })),
    ];
  }
  return [
    { type: 'text', text: fullText },
    ...images.map((image) => ({
      type: 'image_url',
      image_url: { url: `data:${image.mimeType};base64,${image.data}` },
    })),
  ];
}

function parseAiMessages(rawMessages: unknown): { error: string } | { messages: AiUpstreamMessage[] } {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { error: 'messages 必须是非空数组。' };
  }
  const messages: AiUpstreamMessage[] = [];
  const incoming = rawMessages.slice(-MAX_HISTORY_MESSAGES);
  for (const [index, message] of incoming.entries()) {
    const item = message as any;
    if (!item || typeof item !== 'object' || (item.role !== 'user' && item.role !== 'assistant')) {
      return { error: 'messages 中每条消息需要 role（user/assistant）与非空 content。' };
    }
    const isLastUser = index === incoming.length - 1 && item.role === 'user';
    const images = isLastUser ? normalizeAiImages(item.images) : [];
    // 图片只允许当前消息，文本附件可随当前页面会话的历史消息再次进入上下文。
    const attachments = item.role === 'user' ? normalizeAiAttachments(item.attachments) : [];
    const text = typeof item.content === 'string' ? item.content.trim() : '';
    if (!text && images.length === 0 && attachments.length === 0) {
      return { error: 'messages 中每条消息需要 role（user/assistant）与非空 content。' };
    }
    messages.push({
      role: item.role,
      content: text || (attachments.length ? '请结合这些附件理解并回答。' : '请结合这些图片理解并回答。'),
      images,
      attachments: attachments.length ? attachments : undefined,
    });
  }
  if (messages[messages.length - 1].role !== 'user') {
    return { error: 'messages 最后一条必须是用户指令。' };
  }
  return { messages };
}

function validateProvider(raw: unknown): { error: string } | { provider: AiProviderConfig } {
  const provider = raw as any;
  if (!provider || typeof provider !== 'object') {
    return { error: 'provider is required.' };
  }
  const baseUrl = String(provider.baseUrl ?? '').trim();
  const apiKey = String(provider.apiKey ?? '').trim();
  if (!baseUrl || !apiKey) {
    return { error: '该供应商未配置 Base URL 或 API Key。' };
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { error: 'Base URL 无效，请检查供应商配置。' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Base URL 仅支持 HTTP 或 HTTPS。' };
  }
  if (BLOCKED_HOSTS.has(parsed.hostname) || BLOCKED_HOSTS.has(parsed.host)) {
    return { error: 'Base URL 不允许指向本地或内网地址。' };
  }
  return { provider: { baseUrl, apiKey, apiFormat: provider.apiFormat } };
}

export function parseAiChatBody(raw: unknown): { error: string; status: number } | { body: AiChatRequestBody } {
  const payload = raw as any;
  if (!payload || typeof payload !== 'object') {
    return { error: 'Invalid JSON body.', status: 400 };
  }
  if (typeof payload.source !== 'string' || !payload.source.trim()) {
    return { error: 'source is required.', status: 400 };
  }
  const parsed = parseAiMessages(payload.messages);
  if ('error' in parsed) return { error: parsed.error, status: 400 };
  const providerResult = validateProvider(payload.provider);
  if ('error' in providerResult) return { error: providerResult.error, status: 400 };
  const modelId = String(payload.modelId ?? '').trim();
  if (!modelId) {
    return { error: '请先选择模型。', status: 400 };
  }
  return {
    body: {
      source: payload.source,
      messages: parsed.messages,
      provider: providerResult.provider,
      modelId,
    },
  };
}

export function createAiChatHandler(options: { fetchUpstream?: typeof fetch } = {}) {
  const fetchUpstream = options.fetchUpstream ?? globalThis.fetch.bind(globalThis);

  return async function handleAiChat(
    rawBody: unknown,
    opts: { signal?: AbortSignal } = {}
  ): Promise<Response> {
    const parsed = parseAiChatBody(rawBody);
    if ('error' in parsed) return jsonResponse({ error: parsed.error }, parsed.status);

    const { source, messages, provider, modelId } = parsed.body;
    const upstreamRequest = buildUpstreamRequest({
      provider,
      modelId,
      systemPrompt: buildAiSystemPrompt(source),
      messages,
    });

    let upstream: Response;
    try {
      upstream = await fetchUpstream(upstreamRequest.url, {
        method: 'POST',
        headers: upstreamRequest.headers,
        body: upstreamRequest.bodyJson,
        signal: opts.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      if (opts.signal?.aborted) {
        // 客户端主动断开，无需回报
        return new Response(null, { status: 499 });
      }
      return jsonResponse({ error: '无法连接 AI 服务，请检查网络后重试。' }, 502);
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      let message = `AI 服务返回 ${upstream.status}。`;
      try {
        const parsedError = JSON.parse(detail);
        const upstreamError = parsedError?.error?.message ?? parsedError?.message;
        if (upstreamError) message += upstreamError;
      } catch {
        // 无结构化错误信息时保留默认提示
      }
      return jsonResponse({ error: message }, 502);
    }
    if (!upstream.body) {
      return jsonResponse({ error: 'AI 服务未返回内容。' }, 502);
    }

    const encoder = new TextEncoder();
    const upstreamReader = upstream.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (event: AiSseEvent) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        let buffer = '';
        let finished = false;
        let emitted = 0;
        try {
          while (!finished) {
            const { done, value } = await upstreamReader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const data = line.replace(/\r$/, '').trim();
              if (!data.startsWith('data:')) continue;
              const json = data.slice(5).trim();
              if (json === '[DONE]') {
                finished = true;
                break;
              }
              try {
                for (const event of extractUpstreamEvents(JSON.parse(json), upstreamRequest.apiFormat)) {
                  sendEvent(event);
                  emitted += 1;
                }
              } catch {
                // 跳过不完整的事件行
              }
            }
          }
          if (emitted === 0) {
            sendEvent({
              type: 'error',
              message: '模型没有返回文本。请核对模型 ID，以及 API 格式是否与 Base URL 匹配（例如 open.bigmodel.cn/api/anthropic 应选 Anthropic Messages）。',
            });
          }
          await upstreamReader.cancel().catch(() => {});
        } catch {
          try {
            sendEvent({ type: 'error', message: 'AI 生成中断，请重试。' });
          } catch {
            // 连接已断开时无法再通知
          }
        } finally {
          controller.close();
        }
      },
      cancel() {
        upstreamReader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  };
}

export const handleAiChat = createAiChatHandler();

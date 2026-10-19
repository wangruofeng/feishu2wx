import type { AiApiFormat } from './ai-handler';

export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}

type UsageFields = Partial<Record<'input' | 'output' | 'total' | 'cacheRead' | 'cacheWrite' | 'reasoning', number>>;
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const sum = (...values: number[]): number | undefined => {
  const value = values.reduce((total, entry) => total + entry, 0);
  return count(value) ? value : undefined;
};

function extract(payload: any, format: AiApiFormat): UsageFields {
  const fields: UsageFields = {};
  const set = (name: keyof UsageFields, value: unknown) => { if (count(value)) fields[name] = value; };
  if (format === 'google-generative-ai') {
    const usage = payload?.usageMetadata;
    set('input', usage?.promptTokenCount);
    set('output', usage?.candidatesTokenCount);
    set('total', usage?.totalTokenCount);
    set('cacheRead', usage?.cachedContentTokenCount);
    set('reasoning', usage?.thoughtsTokenCount);
  } else if (format === 'anthropic') {
    const usage = payload?.type === 'message_start' ? payload?.message?.usage : payload?.usage;
    set('input', usage?.input_tokens);
    set('output', usage?.output_tokens);
    set('total', usage?.total_tokens);
    set('cacheRead', usage?.cache_read_input_tokens);
    set('cacheWrite', usage?.cache_creation_input_tokens);
  } else {
    const usage = format === 'responses' ? payload?.response?.usage ?? payload?.usage : payload?.usage;
    const chat = format === 'chat-completions';
    set('input', chat ? usage?.prompt_tokens : usage?.input_tokens);
    set('output', chat ? usage?.completion_tokens : usage?.output_tokens);
    set('total', usage?.total_tokens);
    set('cacheRead', chat ? usage?.prompt_tokens_details?.cached_tokens : usage?.input_tokens_details?.cached_tokens);
    set('cacheWrite', chat ? usage?.prompt_tokens_details?.cache_write_tokens : usage?.input_tokens_details?.cache_write_tokens);
    set('reasoning', chat ? usage?.completion_tokens_details?.reasoning_tokens : usage?.output_tokens_details?.reasoning_tokens);
  }
  return fields;
}

/** 同一次请求的事件都是累计快照；取已知字段最大值，重复或乱序旧快照不再发出。 */
export class TokenUsageAccumulator {
  private fields: UsageFields = {};
  private snapshot?: AiTokenUsage;
  constructor(private readonly format: AiApiFormat) {}

  inspect(payload: unknown): AiTokenUsage | undefined {
    const next = extract(payload, this.format);
    if (!Object.keys(next).length) return undefined;
    for (const key of Object.keys(next) as (keyof UsageFields)[]) this.fields[key] = Math.max(this.fields[key] ?? 0, next[key]!);
    const { input, output, total, cacheRead, cacheWrite, reasoning } = this.fields;
    const inputTokens = input === undefined ? undefined : this.format === 'anthropic' ? sum(input, cacheRead ?? 0, cacheWrite ?? 0) : input;
    const outputTokens = output === undefined ? undefined : this.format === 'google-generative-ai' ? sum(output, reasoning ?? 0) : output;
    // 总量只保存供应商原值；展示层可按完整的输入、输出临时推导。
    const totalTokens = total;
    const usage: AiTokenUsage = {
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
      ...(totalTokens !== undefined ? { totalTokens } : {}),
      ...(cacheRead !== undefined ? { cacheReadTokens: cacheRead } : {}),
      ...(cacheWrite !== undefined ? { cacheWriteTokens: cacheWrite } : {}),
      ...(reasoning !== undefined ? { reasoningTokens: reasoning } : {}),
    };
    if (JSON.stringify(usage) === JSON.stringify(this.snapshot)) return undefined;
    this.snapshot = usage;
    return usage;
  }
}

export function parseTokenUsage(payload: unknown, format: AiApiFormat): AiTokenUsage | undefined {
  return new TokenUsageAccumulator(format).inspect(payload);
}

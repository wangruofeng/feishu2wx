export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}

export const tokenUsageFields: [keyof AiTokenUsage, string][] = [
  ['inputTokens', '输入'], ['outputTokens', '输出'], ['totalTokens', '总计'],
  ['cacheReadTokens', '缓存读取'], ['cacheWriteTokens', '缓存写入'], ['reasoningTokens', '推理'],
];

/** 标准十进制缩写，保留一位小数；进位时同步升级单位，避免显示 1000K。 */
export function formatCompactTokenCount(value?: number): string {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return '未返回';
  if (value < 1000) return String(value);
  const units = ['K', 'M', 'B', 'T'];
  let scaled = value / 1000;
  let unit = 0;
  while (Math.round(scaled * 10) / 10 >= 1000 && unit < units.length - 1) {
    scaled /= 1000;
    unit += 1;
  }
  return `${Number(scaled.toFixed(1))}${units[unit]}`;
}

export function normalizeAiTokenUsage(raw: unknown): AiTokenUsage | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const usage: AiTokenUsage = {};
  tokenUsageFields.forEach(([field]) => {
    const value = (raw as Record<string, unknown>)[field];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) usage[field] = value;
  });
  return Object.keys(usage).length ? usage : undefined;
}

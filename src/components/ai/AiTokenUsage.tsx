import React from 'react';
import { tokenUsageFields, normalizeAiTokenUsage, formatCompactTokenCount } from '../../utils/aiTokenUsage';
import type { AiTokenUsage as Usage } from '../../utils/aiTokenUsage';

const format = (count: number | undefined) => count === undefined ? '未返回' : count.toLocaleString('zh-CN');

const AiTokenUsage: React.FC<{ usage?: Usage }> = ({ usage: raw }) => {
  const usage = normalizeAiTokenUsage(raw);
  if (!usage) return <div className="ai-token-usage">Token · 上游未返回用量</div>;
  const sum = usage.inputTokens !== undefined && usage.outputTokens !== undefined
    ? usage.inputTokens + usage.outputTokens : undefined;
  const total = usage.totalTokens ?? (Number.isSafeInteger(sum) ? sum : undefined);
  return (
    <details className="ai-token-usage">
      <summary title={total !== undefined ? `总计 ${format(total)} Token` : undefined}>Token · {total !== undefined ? `总计 ${formatCompactTokenCount(total)}` : '部分用量'}</summary>
      <dl>
        {tokenUsageFields.filter(([field]) => field !== 'totalTokens').map(([field, label]) => (
          <div key={field}><dt>{label}</dt><dd>{format(usage[field])}</dd></div>
        ))}
        <div><dt>总计{usage.totalTokens === undefined && total !== undefined ? '（输入 + 输出）' : ''}</dt><dd>{format(total)}</dd></div>
      </dl>
      <p>缓存、推理已包含在输入或输出中，不重复相加。</p>
    </details>
  );
};

export default AiTokenUsage;

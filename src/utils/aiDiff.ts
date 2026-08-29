// AI 修改稿与原文的行级 diff（LCS 最长公共子序列），用于「查看变更」展示。

export interface AiDiffLine {
  type: 'eq' | 'del' | 'ins';
  text: string;
}

export function diffArticleLines(before: string, after: string): AiDiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];
  // 超大文本退化：逐行对齐比较，避免 O(n*m) 内存爆炸
  if (n * m > 250_000) {
    const ops: AiDiffLine[] = [];
    const limit = Math.max(n, m);
    for (let i = 0; i < limit; i += 1) {
      if (i < n && i < m && a[i] === b[i]) continue;
      if (i < n) ops.push({ type: 'del', text: a[i] });
      if (i < m) ops.push({ type: 'ins', text: b[i] });
    }
    return ops;
  }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: AiDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'eq', text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: a[i] });
      i += 1;
    } else {
      ops.push({ type: 'ins', text: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ type: 'del', text: a[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ type: 'ins', text: b[j] });
    j += 1;
  }
  return ops;
}

export function changedArticleHunks(before: string, after: string): AiDiffLine[][] {
  const ops = diffArticleLines(before, after);
  const hunks: AiDiffLine[][] = [];
  let current: AiDiffLine[] = [];
  for (const op of ops) {
    if (op.type === 'eq') {
      if (current.length) {
        hunks.push(current);
        current = [];
      }
      continue;
    }
    current.push(op);
  }
  if (current.length) hunks.push(current);
  return hunks;
}

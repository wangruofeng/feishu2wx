import { getFrontMatterField } from './markdownRenderer';

/** 历史文档条目，存于 localStorage，数组内最新在前 */
export interface DocHistoryEntry {
  id: string;
  title: string;
  content: string;
  savedAt: number;
}

export type ArchiveSkipReason = 'empty' | 'duplicate' | 'too-large' | 'quota';

export interface ArchiveResult {
  archived: boolean;
  reason?: ArchiveSkipReason;
}

const DOC_HISTORY_KEY = 'feishu2wx_docHistory';
const MAX_DOC_HISTORY = 20;
const MAX_DOC_SIZE_BYTES = 200 * 1024;

/** 兼容不支持 crypto.randomUUID 的环境（旧 Safari / jsdom） */
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

/** 按 UTF-8 计算字符串字节数（ASCII 1 字节、中文等 BMP 3 字节、代理对 4 字节），不依赖 TextEncoder */
function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; i++; }
    else bytes += 3;
  }
  return bytes;
}

/** 读取历史文档列表，脏数据（非法 JSON / 非数组 / 字段缺失）自动过滤或整体自愈为空数组 */
export function loadDocHistory(): DocHistoryEntry[] {
  try {
    const raw = localStorage.getItem(DOC_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is DocHistoryEntry =>
      !!entry
      && typeof (entry as DocHistoryEntry).id === 'string'
      && typeof (entry as DocHistoryEntry).title === 'string'
      && typeof (entry as DocHistoryEntry).content === 'string'
      && typeof (entry as DocHistoryEntry).savedAt === 'number'
    );
  } catch {
    return [];
  }
}

function saveDocHistory(entries: DocHistoryEntry[]): boolean {
  try {
    localStorage.setItem(DOC_HISTORY_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/** 提取文档标题：frontmatter title → 首个 H1 → 未命名文章（与推送标题逻辑一致） */
export function extractDocTitle(markdown: string): string {
  const fmTitle = getFrontMatterField(markdown, 'title');
  if (fmTitle) return fmTitle;
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1].trim() : '未命名文章';
}

/**
 * 把即将被整体替换的文档存入历史。
 * 跳过：空内容 / 与最新一条重复 / 单份 UTF-8 超 200KB；
 * 超条数上限淘汰最旧；配额溢出时逐条淘汰最旧重试，全部失败则放弃（不影响调用方主操作）。
 */
export function archiveCurrentDoc(markdown: string): ArchiveResult {
  if (!markdown.trim()) {
    return { archived: false, reason: 'empty' };
  }

  const history = loadDocHistory();
  if (history.length > 0 && history[0].content === markdown) {
    return { archived: false, reason: 'duplicate' };
  }

  if (utf8ByteLength(markdown) > MAX_DOC_SIZE_BYTES) {
    return { archived: false, reason: 'too-large' };
  }

  const entry: DocHistoryEntry = {
    id: genId(),
    title: extractDocTitle(markdown),
    content: markdown,
    savedAt: Date.now(),
  };

  let list = [entry, ...history].slice(0, MAX_DOC_HISTORY);
  while (true) {
    if (saveDocHistory(list)) {
      return { archived: true };
    }
    list = list.slice(0, -1);
    if (list.length === 0) {
      return { archived: false, reason: 'quota' };
    }
  }
}

/** 删除单条历史，返回剩余列表 */
export function removeDocHistory(id: string): DocHistoryEntry[] {
  const next = loadDocHistory().filter((entry) => entry.id !== id);
  saveDocHistory(next);
  return next;
}

/** 清空全部历史 */
export function clearDocHistory(): void {
  try {
    localStorage.removeItem(DOC_HISTORY_KEY);
  } catch {
    // 忽略：清空失败不影响主流程
  }
}

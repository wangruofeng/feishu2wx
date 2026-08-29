// AI 聊天文本附件：读取 md/csv/json 等文本文件为附件对象（图片走 aiImages.ts 管线）。

import type { AiTextAttachment } from './aiChat';

const MAX_TEXT_FILE_BYTES = 200 * 1024;

// 浏览器对无后缀/少见后缀的 MIME 判定不可靠（.md 常为空），以后缀白名单为主
const TEXT_EXTENSIONS = new Set([
  'md', 'markdown', 'txt', 'csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'html', 'htm',
  'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'sql', 'sh', 'log', 'toml', 'ini',
]);

export function isTextAttachmentFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (TEXT_EXTENSIONS.has(extension)) return true;
  return file.type.startsWith('text/') || file.type === 'application/json';
}

export async function readTextFileAsAttachment(file: File): Promise<AiTextAttachment | null> {
  if (!isTextAttachmentFile(file) || file.size > MAX_TEXT_FILE_BYTES) return null;
  try {
    const content = await file.text();
    // 含 NUL 视为二进制文件，避免把乱码发给模型
    if (content.includes('\u0000')) return null;
    return { name: file.name, size: file.size, content };
  } catch {
    return null;
  }
}

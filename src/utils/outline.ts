/** 文章大纲条目：level 为标题层级（1-3），pos 为标题行在 Markdown 源码中的字符偏移 */
export interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

/** 解析文章大纲（H1-H3 ATX 标题），跳过 frontmatter 与代码块 */
export function parseOutline(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = markdown.split('\n');
  let pos = 0;
  let inFrontmatter = false;
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      pos += line.length + 1;
      continue;
    }
    if (inFrontmatter && trimmed === '---') {
      inFrontmatter = false;
      pos += line.length + 1;
      continue;
    }
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      pos += line.length + 1;
      continue;
    }
    if (!inFrontmatter && !inCodeBlock) {
      const m = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
      if (m) {
        items.push({ level: m[1].length, text: m[2], pos });
      }
    }
    pos += line.length + 1;
  }
  return items;
}

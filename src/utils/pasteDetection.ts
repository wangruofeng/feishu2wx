function looksLikeRenderedMarkdownHtml(html: string): boolean {
  return /<(h[1-6]|pre|blockquote|ul|ol|li|hr)\b/i.test(html);
}

/**
 * 判断纯文本是否是一段 SVG 代码。
 * 以 <svg 开头、以 </svg> 结尾（中间允许空白），且包含 xmlns 或 viewBox 等典型属性，
 * 即可判定为 SVG 源码，粘贴时可转为 data URI 图片以便预览。
 */
export function looksLikeSvgText(text: string): boolean {
  if (!text || !text.trim()) return false;
  const trimmed = text.trim();
  if (!/^<\?xml[\s\S]*?\?>\s*<svg\b/i.test(trimmed) && !/^<svg\b/i.test(trimmed)) {
    return false;
  }
  if (!/<\/svg>\s*$/i.test(trimmed)) return false;
  return /\s(xmlns|viewBox|viewbox|width|height)\s*=/i.test(trimmed);
}

export function looksLikeMarkdownText(text: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  return [
    /^#{1,6}\s/m,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /^>\s/m,
    /```/,
    /`[^`]+`/,
    /!\[[^\]]*\]\([^)]+\)/,
    /\[[^\]]+\]\([^)]+\)/,
    /^\|.+\|$/m,
  ].some((pattern) => pattern.test(text));
}

export function shouldConvertPastedHtml(htmlData: string, textData: string): boolean {
  const normalizedHtml = htmlData.toLowerCase();
  const hasHtmlTable = /<table[\s>]/i.test(htmlData);
  const hasFeishuMarkers = (
    normalizedHtml.includes('data-lark')
    || normalizedHtml.includes('larksuite')
    || normalizedHtml.includes('feishu.cn')
    || normalizedHtml.includes('docs.feishu')
    || normalizedHtml.includes('doc.feishu')
  );

  if (hasFeishuMarkers || hasHtmlTable) {
    return true;
  }

  return Boolean(
    htmlData
    && htmlData.trim()
    && looksLikeRenderedMarkdownHtml(htmlData)
    && !looksLikeMarkdownText(textData)
  );
}

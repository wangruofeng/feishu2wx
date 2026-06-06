function looksLikeRenderedMarkdownHtml(html: string): boolean {
  return /<(h[1-6]|pre|blockquote|ul|ol|li|hr)\b/i.test(html);
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

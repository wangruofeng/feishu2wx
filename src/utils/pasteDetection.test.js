import { looksLikeMarkdownText, shouldConvertPastedHtml } from './pasteDetection';

test('detects raw markdown text and avoids reconverting rendered html', () => {
  const html = '<h1>标题</h1><p>正文</p><pre><code>npm run cli</code></pre>';
  const text = '# 标题\n\n正文\n\n```bash\nnpm run cli\n```';

  expect(looksLikeMarkdownText(text)).toBe(true);
  expect(shouldConvertPastedHtml(html, text)).toBe(false);
});

test('converts rendered markdown html when plain text no longer contains markdown syntax', () => {
  const html = '<h1>标题</h1><p>正文</p><ul><li>列表项</li></ul><pre><code>npm run cli -- auth set --app-id &lt;appid&gt;</code></pre>';
  const text = '标题\n\n正文\n\n列表项\n\nnpm run cli -- auth set --app-id <appid>';

  expect(looksLikeMarkdownText(text)).toBe(false);
  expect(shouldConvertPastedHtml(html, text)).toBe(true);
});

test('still converts feishu html and html tables', () => {
  expect(shouldConvertPastedHtml('<div data-lark-record-format="docx"><p>正文</p></div>', '正文')).toBe(true);
  expect(shouldConvertPastedHtml('<table><tr><td>项目</td></tr></table>', '项目')).toBe(true);
});

test('does not treat feishu2wx article text as a feishu source marker', () => {
  const html = '<p>feishu2wx v1.19：从网页排版工具到可脚本化工作流</p>';
  const text = '# feishu2wx v1.19：从网页排版工具到可脚本化工作流';

  expect(shouldConvertPastedHtml(html, text)).toBe(false);
});

import { looksLikeMarkdownText, looksLikeSvgText, shouldConvertPastedHtml } from './pasteDetection';

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

describe('looksLikeSvgText', () => {
  test('识别带 xmlns 的标准 SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';
    expect(looksLikeSvgText(svg)).toBe(true);
  });

  test('识别带 viewBox 的 SVG', () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="green"/></svg>';
    expect(looksLikeSvgText(svg)).toBe(true);
  });

  test('识别带 XML 声明头的 SVG', () => {
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"></svg>';
    expect(looksLikeSvgText(svg)).toBe(true);
  });

  test('识别前后有空白的 SVG', () => {
    const svg = '  \n<svg xmlns="http://www.w3.org/2000/svg"></svg>\n  ';
    expect(looksLikeSvgText(svg)).toBe(true);
  });

  test('普通文本不是 SVG', () => {
    expect(looksLikeSvgText('hello world')).toBe(false);
    expect(looksLikeSvgText('')).toBe(false);
    expect(looksLikeSvgText('# 标题')).toBe(false);
  });

  test('只有 <svg> 标签但无 SVG 典型属性的不判定为 SVG', () => {
    expect(looksLikeSvgText('<svg>just text</svg>')).toBe(false);
  });

  test('不以 </svg> 结尾的不判定为 SVG', () => {
    expect(looksLikeSvgText('<svg xmlns="http://www.w3.org/2000/svg">')).toBe(false);
  });

  test('识别用户提供的复杂 SVG（带 data-editor-id 属性）', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="1225" viewBox="0 0 980 1225">
  <rect width="980" height="1225" fill="#0f172a" data-editor-id="node-0"/>
  <text x="60" y="64" font-size="30" fill="#f8fafc">标题</text>
</svg>`;
    expect(looksLikeSvgText(svg)).toBe(true);
  });
});

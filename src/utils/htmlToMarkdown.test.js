import { convertHtmlToMarkdown } from './htmlToMarkdown';

test('converts pasted Feishu table without explicit header cells to markdown table', () => {
  const html = `
    <div data-lark-record-format="docx">
      <table>
        <tbody>
          <tr><td>项目</td><td>状态</td></tr>
          <tr><td>源码解析</td><td>完成</td></tr>
        </tbody>
      </table>
    </div>
  `;

  expect(convertHtmlToMarkdown(html)).toBe([
    '| 项目 | 状态 |',
    '| --- | --- |',
    '| 源码解析 | 完成 |',
  ].join('\n'));
});

test('keeps table cell pipes and line breaks valid in markdown table cells', () => {
  const html = `
    <table>
      <tbody>
        <tr><td>名称</td><td>说明</td></tr>
        <tr><td>A | B</td><td><p>第一行</p><p>第二行</p></td></tr>
      </tbody>
    </table>
  `;

  expect(convertHtmlToMarkdown(html)).toBe([
    '| 名称 | 说明 |',
    '| --- | --- |',
    '| A \\| B | 第一行<br>第二行 |',
  ].join('\n'));
});

test('does not wrap inline code in bold when pasted from Feishu', () => {
  const html = '<div>也支持导入本地 <strong><code>.md</code></strong> 文件</div>';

  expect(convertHtmlToMarkdown(html)).toBe('也支持导入本地 `.md` 文件');
});

test('keeps bold for non-code text', () => {
  const html = '<div>这是 <strong>重点</strong> 内容</div>';

  expect(convertHtmlToMarkdown(html)).toBe('这是 **重点** 内容');
});

test('converts inline svg element to base64 data uri image markdown', () => {
  const html = '<div>前文</div><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg><div>后文</div>';
  const markdown = convertHtmlToMarkdown(html);

  expect(markdown).toContain('![](data:image/svg+xml;base64,');
  expect(markdown).toContain('前文');
  expect(markdown).toContain('后文');
  // SVG 图形不再被拆成零散文字
  expect(markdown).not.toMatch(/^rect$/m);
});

test('uses svg aria-label as image alt and keeps utf-8 svg payload decodable', () => {
  const html = '<svg xmlns="http://www.w3.org/2000/svg" aria-label="架构图" width="10" height="10"><title>标题</title></svg>';
  const markdown = convertHtmlToMarkdown(html);

  expect(markdown).toMatch(/^!\[架构图\]\(data:image\/svg\+xml;base64,/);
  const base64 = markdown.match(/base64,([^)]+)\)$/)?.[1] ?? '';
  const decoded = decodeURIComponent(atob(base64).split('').map((ch) => (
    '%' + ch.charCodeAt(0).toString(16).padStart(2, '0')
  )).join(''));
  expect(decoded).toContain('<svg');
  expect(decoded).toContain('架构图');
});

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

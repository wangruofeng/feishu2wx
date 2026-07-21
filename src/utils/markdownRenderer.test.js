import { renderMarkdown, setCodeBlockStyle, setShowHorizontalRule, extractFrontMatterTitle } from './markdownRenderer';

beforeEach(() => {
  setCodeBlockStyle('classic');
  setShowHorizontalRule(true);
});

test('adds no-referrer policy to markdown image urls in preview html', () => {
  const html = renderMarkdown('![说明](https://example.com/a.png)');
  const container = document.createElement('div');
  container.innerHTML = html;
  const img = container.querySelector('img');

  expect(img).not.toBeNull();
  expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
});

test('adds no-referrer policy to inline html image urls in preview html', () => {
  const html = renderMarkdown('<img src="https://example.com/b.png" alt="说明">');
  const container = document.createElement('div');
  container.innerHTML = html;
  const img = container.querySelector('img');

  expect(img).not.toBeNull();
  expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
});

test('sanitizes executable html from preview output', () => {
  const html = renderMarkdown('<img src="x" onerror="alert(document.domain)"><script>alert(1)</script>');
  const container = document.createElement('div');
  container.innerHTML = html;

  expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
  expect(container.querySelector('script')).toBeNull();
});

test('keeps frontmatter hidden by default while rendering markdown body', () => {
  const html = renderMarkdown('---\ntitle: 测试标题\ntags: [趋势洞察, 创业]\n---\n# 正文标题');

  expect(html).toContain('<h1><span class="h1-inline-block">正文标题</span></h1>');
  expect(html).not.toContain('frontmatter-preview');
  expect(html).not.toContain('测试标题');
});

test('renders frontmatter preview when enabled', () => {
  const html = renderMarkdown(
    '---\ntitle: SpaceX 上市\ndescription: SpaceX 以 135 美元定价\npublished: 2026-06-13T02:49:54+08:00\ntags:\n  - 趋势洞察\n  - 创业\ndraft: true\nsource_url: https://www.sec.gov/example.htm\n---\n# SpaceX 上市',
    { showFrontMatter: true }
  );
  const container = document.createElement('div');
  container.innerHTML = html;
  const preview = container.querySelector('.frontmatter-preview');
  const tags = container.querySelectorAll('.frontmatter-tags span');

  expect(preview).not.toBeNull();
  expect(preview.getAttribute('data-preview-only')).toBe('true');
  expect(preview.querySelector('h2').textContent).toBe('元数据');
  expect(preview.textContent).toContain('title');
  expect(preview.textContent).toContain('SpaceX 上市');
  expect(preview.textContent).toContain('source_url');
  expect(tags).toHaveLength(2);
  expect(tags[0].textContent).toBe('趋势洞察');
  expect(tags[1].textContent).toBe('创业');
  expect(container.querySelector('h1').textContent).toBe('SpaceX 上市');
});

test('extractFrontMatterTitle reads title field from front matter', () => {
  const md = '---\ntitle: SpaceX 上市\ndescription: 以 135 美元定价\n---\n# SpaceX 上市';
  expect(extractFrontMatterTitle(md)).toBe('SpaceX 上市');
});

test('extractFrontMatterTitle strips surrounding quotes from the value', () => {
  const md = '---\ntitle: "我的标题"\n---\n# 正文';
  expect(extractFrontMatterTitle(md)).toBe('我的标题');
});

test('extractFrontMatterTitle returns null when no front matter or no title', () => {
  expect(extractFrontMatterTitle('# 仅正文标题')).toBeNull();
  expect(extractFrontMatterTitle('---\ndescription: 无标题\n---\n# 正文')).toBeNull();
});

test('renders punctuation-ended strong syntax followed by Chinese text', () => {
  const html = renderMarkdown('**国际大厂卷基础设施和安全，中文项目卷场景落地和数据采集，两边各自在擅长的层面把事情做深。**这其实是生态成熟的表现');
  const container = document.createElement('div');
  container.innerHTML = html;
  const strong = container.querySelector('strong');

  expect(strong).not.toBeNull();
  expect(strong.textContent).toBe('国际大厂卷基础设施和安全，中文项目卷场景落地和数据采集，两边各自在擅长的层面把事情做深。');
  expect(container.textContent.trim()).toBe('国际大厂卷基础设施和安全，中文项目卷场景落地和数据采集，两边各自在擅长的层面把事情做深。这其实是生态成熟的表现');
});

test('keeps punctuation-ended strong syntax working in modern code block style', () => {
  setCodeBlockStyle('modern');
  const html = renderMarkdown('**做深！**这其实是生态成熟的表现');
  const container = document.createElement('div');
  container.innerHTML = html;

  expect(container.querySelector('strong')?.textContent).toBe('做深！');
  expect(container.textContent.trim()).toBe('做深！这其实是生态成熟的表现');
});

test('does not let multiple strong spans consume each other', () => {
  const markdown = '**姚顺雨**：他是研究员，但主要做产品方向。Anthropic 后来有了独立的产品部门，但以前不是这么分的。Anthropic 的产品经理似乎真的很懂 AI——这也是为什么我开头说，AI 短期内还替代不了好的产品经理。**好的产品经理知道怎么和 AI 协作。**这跟上一代靠花哨展示的产品经理完全不同。';
  const html = renderMarkdown(markdown);
  const container = document.createElement('div');
  container.innerHTML = html;
  const strongs = container.querySelectorAll('strong');

  expect(strongs).toHaveLength(2);
  expect(strongs[0].textContent).toBe('姚顺雨');
  expect(strongs[1].textContent).toBe('好的产品经理知道怎么和 AI 协作。');
  expect(container.textContent).not.toContain('**');
});

test('renders double-equals text as a selective highlight', () => {
  const html = renderMarkdown('普通文字 ==重点文字== 继续文字');
  const container = document.createElement('div');
  container.innerHTML = html;

  const mark = container.querySelector('mark');
  expect(mark).not.toBeNull();
  expect(mark?.textContent).toBe('重点文字');
});

test('renders mermaid code block as placeholder div in classic style', () => {
  const html = renderMarkdown('```mermaid\ngraph LR\nA-->B\n```');
  const container = document.createElement('div');
  container.innerHTML = html;

  const mermaidDiv = container.querySelector('.mermaid');
  expect(mermaidDiv).not.toBeNull();
  expect(decodeURIComponent(mermaidDiv.getAttribute('data-mermaid-source'))).toContain('graph LR');
  expect(mermaidDiv.textContent).toContain('graph LR');
  expect(mermaidDiv.closest('pre, code')).toBeNull();
});

test('renders mermaid code block as placeholder div in modern style', () => {
  setCodeBlockStyle('modern');
  const html = renderMarkdown('```mermaid\nsequenceDiagram\nA->>B: Hi\n```');
  const container = document.createElement('div');
  container.innerHTML = html;

  const mermaidDiv = container.querySelector('.mermaid');
  expect(mermaidDiv).not.toBeNull();
  expect(mermaidDiv.getAttribute('data-mermaid-source')).toContain('sequenceDiagram');
  expect(mermaidDiv.closest('pre, code')).toBeNull();
});

test('keeps normal code blocks unaffected by mermaid handling', () => {
  const html = renderMarkdown('```js\nconsole.log("hi")\n```');
  const container = document.createElement('div');
  container.innerHTML = html;

  expect(container.querySelector('pre code.hljs')).not.toBeNull();
  expect(container.querySelector('.mermaid')).toBeNull();
});

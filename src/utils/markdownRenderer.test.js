import { renderMarkdown, setCodeBlockStyle, setShowHorizontalRule } from './markdownRenderer';

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

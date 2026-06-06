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

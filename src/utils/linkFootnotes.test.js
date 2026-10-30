import { convertLinksToFootnotes } from './linkFootnotes';
import { formatForWeChat, copySelectedToWeChat } from './wechatCopy';

const options = ['classic', 'default', true, 'border', false, 'classic', false, false, false, false, true, 'default', 'loose', 'theme', 'left', true, 'purple', 'none', true];

test('browser preview and output share deduplicated notes and the conversion is idempotent', () => {
  const input = '<p><a href="https://example.com/one"><strong>来源</strong></a>，<a href="https://example.com/one">再次引用</a>，<a href="https://example.com/two">https://example.com/two</a></p><pre><code>https://example.com/code</code></pre><img src="./image.png">';
  const preview = convertLinksToFootnotes(input);
  const container = document.createElement('div');
  container.innerHTML = preview;
  expect(container.querySelectorAll('.footnotes-list > li')).toHaveLength(2);
  expect([...container.querySelectorAll('.footnote-ref')].map(ref => ref.textContent)).toEqual(['[1]', '[1]', '[2]']);
  expect(container.querySelector('strong').textContent).toBe('来源');
  expect(container.querySelector('img').getAttribute('src')).toBe('./image.png');
  expect(convertLinksToFootnotes(preview)).toBe(preview);
  container.innerHTML = formatForWeChat(input, ...options);
  expect(container.querySelector('.footnote-ref').style.verticalAlign).toBe('super');
  expect(container.querySelector('.footnotes-list').textContent).toContain('https://example.com/one');
  container.querySelector('.footnotes').remove();
  container.querySelector('pre').remove();
  expect(container.textContent).not.toMatch(/https?:/);
});

test('selected copy includes only the selected references with their original numbers', async () => {
  const preview = document.createElement('div');
  preview.className = 'preview-content';
  preview.innerHTML = convertLinksToFootnotes('<p><a href="https://example.com/one">第一段</a></p><p><a href="https://example.com/two">第二段</a></p>');
  document.body.append(preview);
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(preview.querySelectorAll('p')[1]);
  selection.removeAllRanges();
  selection.addRange(range);
  const originalExec = document.execCommand;
  let copied = '';
  document.execCommand = jest.fn(command => {
    if (command === 'copy') copied = document.body.lastElementChild.innerHTML;
    return true;
  });
  try {
    const result = await copySelectedToWeChat(...options);
    expect(result.success).toBe(true);
    const content = document.createElement('div');
    content.innerHTML = copied;
    expect(content.querySelector('.footnote-ref').textContent).toBe('[2]');
    expect(content.querySelectorAll('.footnotes-list > li')).toHaveLength(1);
    expect(content.querySelector('.footnotes-list > li').getAttribute('value')).toBe('2');
    expect(content.textContent).toContain('https://example.com/two');
    expect(content.textContent).not.toContain('https://example.com/one');
  } finally {
    document.execCommand = originalExec;
    selection.removeAllRanges();
    preview.remove();
  }
});

import { formatForWeChat } from './wechatCopy';

test('formats h1 with inverted text and background styles when enabled', () => {
  const html = '<h1>测试标题</h1>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'classic',
    true
  );

  expect(formattedHtml).toContain('display: table');
  expect(formattedHtml).toContain('color: rgb(255, 255, 255)');
  expect(formattedHtml).toContain('background-color: rgb(82, 196, 26)');
});

test('formats inverted h1 wrapper centered for wechat copy', () => {
  const html = '<h1>测试标题</h1>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'classic',
    true
  );

  expect(formattedHtml).toContain('text-align: center');
  expect(formattedHtml).toContain('display: table');
  expect(formattedHtml).toContain('margin: 0px auto');
});

test('formats classic code blocks left-aligned for wechat copy', () => {
  const html = '<pre><code>const answer = 42;\nconsole.log(answer);</code></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'classic',
    false
  );

  expect(formattedHtml).toContain('<pre');
  expect(formattedHtml).toContain('text-align: left');
});

test('formats ascii art code blocks as images for wechat copy', () => {
  const html = '<pre><code class="language-ascii">┌───┐\n│ A │\n└───┘</code></pre>';
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const fillRect = jest.fn();
  const fillText = jest.fn();
  const scale = jest.fn();
  let createdCanvas = null;

  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    createdCanvas = this;
    return {
    fillStyle: '',
    font: '',
    textBaseline: '',
    fillRect,
    fillText,
    scale,
    };
  });
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-ascii-art');

  try {
    const formattedHtml = formatForWeChat(
      html,
      'green',
      'default',
      true,
      'border',
      'classic',
      false
    );

    expect(formattedHtml).toContain('<img');
    expect(formattedHtml).toContain('data:image/png');
    expect(formattedHtml).not.toContain('<pre');
    expect(fillRect).toHaveBeenCalled();
    expect(fillText).toHaveBeenCalled();
    expect(scale).toHaveBeenCalledWith(2, 2);
    expect(createdCanvas.width).toBe(320);
    expect(createdCanvas.height).toBe(190);
  } finally {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  }
});

test('keeps normal code blocks as preformatted html for wechat copy', () => {
  const html = '<pre><code>const answer = 42;\nconsole.log(answer);</code></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'classic',
    false
  );

  expect(formattedHtml).toContain('<pre');
  expect(formattedHtml).not.toContain('data:image/svg+xml');
  expect(formattedHtml).not.toContain('data:image/png');
});

test('keeps unmarked ascii-looking code blocks as preformatted html for wechat copy', () => {
  const html = '<pre><code>┌───┐\n│ A │\n└───┘</code></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'classic',
    false
  );

  expect(formattedHtml).toContain('<pre');
  expect(formattedHtml).not.toContain('data:image/png');
});

test('formats modern code blocks with the same key visual styles as preview', () => {
  const html = '<pre class="modern-code-block"><div class="code-block-header"><span class="code-block-dot red"></span><span class="code-block-dot orange"></span><span class="code-block-dot green"></span></div><div class="code-block-content"><code class="hljs language-js"><span class="hljs-keyword">const</span> answer = 42;</code></div></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'modern',
    false
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;

  const pre = container.querySelector('pre');
  const header = container.querySelector('pre > div');
  const codeContainer = container.querySelector('pre > div + div');
  const code = container.querySelector('code');

  expect(pre).not.toBeNull();
  expect(header).not.toBeNull();
  expect(codeContainer).not.toBeNull();
  expect(code).not.toBeNull();

  expect(pre.style.backgroundColor).toBe('rgb(40, 44, 52)');
  expect(header.style.backgroundColor).toBe('rgb(33, 37, 43)');
  expect(header.style.borderBottom).toBe('');
  expect(code.style.color).toBe('rgb(171, 178, 191)');
  expect(code.style.padding).toBe('16px');
});

test('formats modern code block header dots as non-empty elements for wechat paste', () => {
  const html = '<pre class="modern-code-block"><div class="code-block-header"><span class="code-block-dot red"></span><span class="code-block-dot orange"></span><span class="code-block-dot green"></span></div><div class="code-block-content"><code>const answer = 42;</code></div></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'modern',
    false
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  const dots = container.querySelectorAll('pre > div span');

  expect(dots).toHaveLength(3);
  dots.forEach((dot) => {
    expect(dot.innerHTML).not.toBe('');
  });
});

test('formats modern code blocks with explicit whitespace preservation for indentation', () => {
  const html = '<pre class="modern-code-block"><div class="code-block-header"><span class="code-block-dot red"></span><span class="code-block-dot orange"></span><span class="code-block-dot green"></span></div><div class="code-block-content"><code class="hljs language-js"><span class="hljs-keyword">if</span> (ready) {\n  console.log("ok");\n\treturn 1;\n}</code></div></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    'modern',
    false
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  const code = container.querySelector('code');

  expect(code).not.toBeNull();
  expect(code.innerHTML).toContain('<br>');
  expect(code.innerHTML).toContain('&nbsp;&nbsp;console.log');
  expect(code.innerHTML).toContain('&nbsp;&nbsp;&nbsp;&nbsp;return&nbsp;1;');
});

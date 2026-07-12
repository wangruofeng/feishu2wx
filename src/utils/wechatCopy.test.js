import { convertSvgImagesToPng, formatForWeChat } from './wechatCopy';

function mockSvgRasterizer() {
  const originalImage = global.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataUrl = HTMLCanvasElement.prototype.toDataURL;

  global.Image = class {
    set src(_value) {
      setTimeout(() => this.onload && this.onload());
    }
  };
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({ drawImage: jest.fn() }));
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-png');

  return () => {
    global.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataUrl;
  };
}

test('converts svg image sources to png data urls before wechat copy', async () => {
  const restore = mockSvgRasterizer();
  const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40"/></svg>');

  try {
    const html = await convertSvgImagesToPng(`<p><img src="data:image/svg+xml,${svg}" alt="图"></p>`);

    expect(html).toContain('src="data:image/png;base64,mock-png"');
    expect(html).not.toContain('data:image/svg+xml');
  } finally {
    restore();
  }
});

test('converts inline svg elements to png images before wechat copy', async () => {
  const restore = mockSvgRasterizer();

  try {
    const html = await convertSvgImagesToPng('<svg width="80" height="40" aria-label="图标"><rect width="80" height="40"/></svg>');

    expect(html).toContain('<img');
    expect(html).toContain('src="data:image/png;base64,mock-png"');
    expect(html).toContain('alt="图标"');
    expect(html).not.toContain('<svg');
  } finally {
    restore();
  }
});

test('converts Mermaid-style svg with foreignObject labels to png images', async () => {
  const restore = mockSvgRasterizer();

  try {
    const html = await convertSvgImagesToPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 160 80"><foreignObject width="160" height="80"><div xmlns="http://www.w3.org/1999/xhtml">Mermaid 标签</div></foreignObject></svg>'
    );

    expect(html).toContain('src="data:image/png;base64,mock-png"');
    expect(html).not.toContain('<svg');
  } finally {
    restore();
  }
});

test('converts Mermaid-style svg with xlink references to png images', async () => {
  const restore = mockSvgRasterizer();

  try {
    const html = await convertSvgImagesToPng(
      '<svg width="80" height="40"><defs><path id="arrow" d="M0 0h10"/></defs><use xlink:href="#arrow"/></svg>'
    );

    expect(html).toContain('src="data:image/png;base64,mock-png"');
    expect(html).not.toContain('<svg');
  } finally {
    restore();
  }
});

test('formats h1 with inverted text and background styles when enabled', () => {
  const html = '<h1>测试标题</h1>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    true
  );

  expect(formattedHtml).toContain('display: table');
  expect(formattedHtml).toContain('color: rgb(255, 255, 255)');
  expect(formattedHtml).toContain('background-color: rgb(13, 148, 136)');
});

test('formats inverted h1 wrapper centered for wechat copy', () => {
  const html = '<h1>测试标题</h1>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    true
  );

  expect(formattedHtml).toContain('text-align: center');
  expect(formattedHtml).toContain('display: table');
  expect(formattedHtml).toContain('margin: 0px auto');
});

test('matches orange preview heading colors for wechat copy and publish', () => {
  const html = '<h1>一级标题</h1><h2>二级标题</h2>';

  const formattedHtml = formatForWeChat(
    html,
    'orange',
    'default',
    true,
    'border',
    false,
    'classic',
    true,
    true
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  const h1Wrapper = container.querySelector('h1 .h1-inline-block');
  const h2Wrapper = container.querySelector('h2 .h2-inline-block');

  expect(h1Wrapper.style.backgroundColor).toBe('rgb(253, 70, 6)');
  expect(h1Wrapper.style.color).toBe('rgb(255, 255, 255)');
  expect(container.querySelector('h1').style.color).toBe('rgb(253, 70, 6)');
  expect(h2Wrapper.style.backgroundColor).toBe('rgb(253, 70, 6)');
  expect(h2Wrapper.style.color).toBe('rgb(255, 255, 255)');
});

test('shares generic layout sizes with non-generic themes', () => {
  const html = '<h1>一级标题</h1><h2>二级标题</h2><h3>三级标题</h3><p>正文内容</p><blockquote><p>重点引用</p></blockquote>';
  const container = document.createElement('div');
  container.innerHTML = formatForWeChat(html, 'orange');

  expect(container.querySelector('h1')?.style.margin).toBe('0px 0px 14px 0px');
  expect(container.querySelector('h1')?.style.padding).toBe('0px 0px 0px 0px');
  expect(container.querySelector('h1')?.style.fontSize).toBe('24px');
  expect(container.querySelector('h1')?.style.letterSpacing).toBe('0.544px');
  expect(container.querySelector('h2')?.style.margin).toBe('65px 0px 27px 0px');
  expect(container.querySelector('h2')?.style.fontSize).toBe('21px');
  expect(container.querySelector('h3')?.style.margin).toBe('27px 0px 27px 0px');
  expect(container.querySelector('h3')?.style.fontSize).toBe('16px');
  expect(container.querySelector('p')?.style.margin).toBe('27px 0px');
  expect(container.querySelector('p')?.style.fontSize).toBe('15px');
  expect(container.querySelector('p')?.style.letterSpacing).toBe('0.544px');
  expect(container.querySelector('blockquote')?.style.margin).toBe('26px 0px');
  expect(container.querySelector('blockquote')?.style.fontSize).toBe('15px');
  expect(container.querySelector('blockquote')?.style.letterSpacing).toBe('0.544px');
});

test('uses the generic or active theme color for blockquotes', () => {
  const html = '<blockquote><p>重点引用</p></blockquote>';

  const genericHtml = formatForWeChat(
    html,
    'orange',
    'default',
    true,
    'default',
    false,
    'classic',
    false,
    false,
    false,
    true,
    'default'
  );
  const themeHtml = formatForWeChat(
    html,
    'orange',
    'default',
    true,
    'default',
    false,
    'classic',
    false,
    false,
    false,
    true,
    'theme'
  );

  const genericQuote = document.createElement('div');
  genericQuote.innerHTML = genericHtml;
  const themedQuote = document.createElement('div');
  themedQuote.innerHTML = themeHtml;

  expect(genericQuote.querySelector('blockquote')?.style.borderLeft).toBe('4px solid #D8D8D8');
  expect(themedQuote.querySelector('blockquote')?.style.borderLeft).toBe('4px solid #FD4606');
});

test('formats independent blockquote background and height modes', () => {
  const html = '<blockquote><p>重点引用</p></blockquote>';
  const compactHtml = formatForWeChat(
    html,
    'teal',
    'default',
    true,
    'default',
    false,
    'classic',
    false,
    false,
    false,
    true,
    'default',
    'compact',
    'none'
  );
  const looseHtml = formatForWeChat(
    html,
    'teal',
    'default',
    true,
    'default',
    false,
    'classic',
    false,
    false,
    false,
    true,
    'theme',
    'loose',
    'theme'
  );

  const compactContainer = document.createElement('div');
  compactContainer.innerHTML = compactHtml;
  const looseContainer = document.createElement('div');
  looseContainer.innerHTML = looseHtml;

  const compactQuote = compactContainer.querySelector('blockquote');
  const looseQuote = looseContainer.querySelector('blockquote');
  expect(compactQuote?.style.backgroundColor).toBe('transparent');
  expect(compactQuote?.style.paddingTop).toBe('0px');
  expect(compactQuote?.style.paddingBottom).toBe('0px');
  expect(looseQuote?.style.backgroundColor).toBe('rgb(240, 253, 250)');
  expect(looseQuote?.style.paddingTop).toBe('12px');
  expect(looseQuote?.style.paddingBottom).toBe('12px');
});

test('applies orange theme blockquote background when following the theme', () => {
  const html = '<blockquote><p>重点引用</p></blockquote>';
  const container = document.createElement('div');
  container.innerHTML = formatForWeChat(
    html,
    'orange',
    'default',
    true,
    'default',
    false,
    'classic',
    false,
    false,
    false,
    true,
    'theme',
    'loose',
    'theme',
    'left'
  );

  expect(container.querySelector('blockquote')?.style.backgroundColor).toBe('rgb(255, 247, 237)');
});

test('applies the configured default text alignment to article elements', () => {
  const html = '<p>正文</p><ul><li>列表</li></ul><blockquote><p>引用</p></blockquote>';
  const container = document.createElement('div');
  container.innerHTML = formatForWeChat(
    html,
    'blue',
    'default',
    true,
    'default',
    false,
    'classic',
    false,
    false,
    false,
    true,
    'default',
    'loose',
    'none',
    'justify'
  );

  expect(container.querySelector('p')?.style.textAlign).toBe('justify');
  expect(container.querySelector('ul')?.style.textAlign).toBe('justify');
  expect(container.querySelector('li')?.style.textAlign).toBe('justify');
  expect(container.querySelector('blockquote')?.style.textAlign).toBe('justify');
});

test('uses the shared link style for every theme', () => {
  const html = '<p><a href="https://example.com">链接</a></p>';
  const expectedColor = 'rgb(87, 107, 149)';

  ['teal', 'classic', 'orange', 'blue'].forEach((theme) => {
    const container = document.createElement('div');
    container.innerHTML = formatForWeChat(html, theme);
    const link = container.querySelector('a');

    expect(link?.style.color).toBe(expectedColor);
    expect(link?.style.textDecoration).toBe('none');
  });
});

test('formats classic code blocks left-aligned for wechat copy', () => {
  const html = '<pre><code>const answer = 42;\nconsole.log(answer);</code></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    false
  );

  expect(formattedHtml).toContain('<pre');
  expect(formattedHtml).toContain('text-align: left');
});

test('removes preview-only frontmatter before wechat copy', () => {
  const html = '<section class="frontmatter-preview" data-preview-only="true"><h2>元数据</h2><dl><div><dt>title</dt><dd>测试标题</dd></div></dl></section><h1>正文标题</h1>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    false
  );

  expect(formattedHtml).not.toContain('frontmatter-preview');
  expect(formattedHtml).not.toContain('元数据');
  expect(formattedHtml).toContain('正文标题');
});

test('keeps normal code blocks as preformatted html for wechat copy', () => {
  const html = '<pre><code>const answer = 42;\nconsole.log(answer);</code></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
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
    false,
    'classic',
    false
  );

  expect(formattedHtml).toContain('<pre');
  expect(formattedHtml).not.toContain('data:image/png');
});

test('removes extra vertical spacing around copied images', () => {
  const html = '<p>前文</p><p><br></p><p>\n  <img src="https://example.com/a.png" alt="">\n</p><p><br></p><p>后文</p>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    false
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  const wrapper = container.querySelector('.wechat-image-wrapper');
  const img = container.querySelector('img');

  expect(container.querySelector('p img')).toBeNull();
  expect(container.querySelector('p:empty')).toBeNull();
  expect(wrapper).not.toBeNull();
  expect(wrapper.tagName).toBe('SECTION');
  expect(wrapper.style.margin).toBe('16px 0px');
  expect(wrapper.style.padding).toBe('0px');
  expect(wrapper.style.fontSize).toBe('0px');
  expect(wrapper.style.lineHeight).toBe('0');
  expect(img).not.toBeNull();
  expect(img.parentElement).toBe(wrapper);
  expect(img.style.display).toBe('inline-block');
  expect(img.style.verticalAlign).toBe('top');
  expect(img.style.margin).toBe('0px auto');
  expect(formattedHtml).not.toContain('>\n  <img');
  expect(formattedHtml).not.toContain('<img src="https://example.com/a.png" alt="" style="max-width: 100%; width: auto; height: auto; display: block; margin: 16px auto');
});

test('downgrades image figures to wechat-safe blocks while keeping caption', () => {
  const html = '<figure class="img-figure"><img src="https://example.com/a.png" alt="说明"><figcaption class="img-caption">说明</figcaption></figure>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    false
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  const figure = container.querySelector('figure');
  const figcaption = container.querySelector('figcaption');
  const wrapper = container.querySelector('.wechat-image-wrapper');
  const caption = container.querySelector('p.img-caption');
  const img = container.querySelector('img');

  expect(figure).toBeNull();
  expect(figcaption).toBeNull();
  expect(wrapper).not.toBeNull();
  expect(wrapper.tagName).toBe('SECTION');
  expect(caption).not.toBeNull();
  expect(caption.textContent).toBe('说明');
  expect(img).not.toBeNull();
  expect(wrapper.style.margin).toBe('16px 0px');
  expect(wrapper.style.padding).toBe('0px');
  expect(wrapper.style.fontSize).toBe('0px');
  expect(wrapper.style.lineHeight).toBe('0');
  expect(img.style.display).toBe('inline-block');
  expect(img.style.verticalAlign).toBe('top');
  expect(img.style.margin).toBe('0px auto');
  expect(caption.style.fontSize).toBe('12px');
  expect(caption.style.color).toBe('rgb(167, 167, 167)');
  expect(caption.style.marginTop).toBe('6px');
});

test('removes formatting whitespace from loose lists before wechat publish', () => {
  const html = '<ol>\n<li>\n<p><strong>主体描述尽量简洁</strong>——减少空行</p>\n</li>\n<li>\n<p><strong>色彩点缀自动生成</strong>——保持紧凑</p>\n</li>\n</ol><ul>\n<li>\n<p><strong>ChatGPT Images</strong>——线条最干净</p>\n</li>\n</ul>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
    'classic',
    false
  );

  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  const listItems = Array.from(container.querySelectorAll('li'));

  expect(listItems).toHaveLength(3);
  expect(container.querySelector('li p')).toBeNull();

  listItems.forEach((li) => {
    expect(Array.from(li.childNodes).some((node) => (
      node.nodeType === Node.TEXT_NODE && /[\r\n]/.test(node.textContent || '') && !node.textContent.trim()
    ))).toBe(false);
    expect(li.textContent.trim()).not.toBe('');
    expect(li.firstElementChild?.tagName).toBe('SPAN');
  });
});

test('formats modern code blocks with the same key visual styles as preview', () => {
  const html = '<pre class="modern-code-block"><div class="code-block-header"><span class="code-block-dot red"></span><span class="code-block-dot orange"></span><span class="code-block-dot green"></span></div><div class="code-block-content"><code class="hljs language-js"><span class="hljs-keyword">const</span> answer = 42;</code></div></pre>';

  const formattedHtml = formatForWeChat(
    html,
    'green',
    'default',
    true,
    'border',
    false,
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
    false,
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
    false,
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

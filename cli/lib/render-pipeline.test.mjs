import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('renderWechatHtml converts markdown to inline-styled WeChat HTML', () => {
  const { renderWechatHtml } = require('./render-pipeline.cjs');
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');

  const html = renderWechatHtml('# 标题\n\n- [x] 完成\n\n```js\nconst x = 1;\n```', {
    ...DEFAULT_THEME_CONFIG,
    theme: 'blue',
  });

  assert.match(html, /标题/);
  assert.match(html, /完成/);
  assert.match(html, /style="/);
  assert.match(html, /rgb\(15, 76, 129\)/);
  assert.match(html, /const/);
});

test('renderWechatHtml keeps native ordered markers inside the content box', () => {
  const { renderWechatHtml } = require('./render-pipeline.cjs');
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');
  const { JSDOM } = require('jsdom');

  const html = renderWechatHtml('- 无序项\n\n1. 有序项', DEFAULT_THEME_CONFIG);
  const document = new JSDOM(`<body>${html}</body>`).window.document;
  const unorderedList = document.querySelector('ul');
  const unorderedItem = unorderedList?.querySelector('li');
  const bullet = unorderedItem?.querySelector('.wechat-list-bullet');
  const orderedList = document.querySelector('ol');
  const orderedItem = orderedList?.querySelector('li');

  assert.equal(unorderedList?.style.listStyle, 'none');
  assert.equal(unorderedList?.style.paddingLeft, '0px');
  assert.equal(unorderedItem?.style.paddingLeft, '16px');
  assert.equal(unorderedItem?.style.textIndent, '-16px');
  assert.equal(bullet?.style.width, '6px');
  assert.equal(bullet?.style.height, '6px');
  assert.equal(bullet?.style.marginRight, '10px');
  assert.equal(bullet?.textContent, '●');
  assert.equal(orderedList?.style.listStyle, '');
  assert.equal(orderedList?.style.paddingLeft, '0px');
  assert.equal(orderedList?.style.listStylePosition, 'inside');
  assert.equal(orderedItem?.style.paddingLeft, '24px');
  assert.equal(orderedItem?.style.textIndent, '-24px');
  assert.equal(orderedItem?.querySelector('.wechat-list-number'), null);
});


test('link footnotes collect inline, reference, bare and HTML links without changing images or code', () => {
  const { renderWechatHtml } = require('./render-pipeline.cjs');
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');
  const { JSDOM } = require('jsdom');
  const markdown = `正文 [官方资料](https://example.com/report?a=1&b=2)，以及 [同一来源][report]。

[report]: https://example.com/report?a=1&b=2

<a href="https://example.com/second">第二来源</a> 与 https://example.com/third

![图片](./imgs/chart.png)

[![可点击图片](./imgs/linked.png)](https://example.com/image)

[页内跳转](#section)

\`https://example.com/code\`

\`\`\`text
[代码链接](https://example.com/ignored)
\`\`\``;
  const html = renderWechatHtml(markdown, { ...DEFAULT_THEME_CONFIG, wechatLinkFootnotes: true });
  const document = new JSDOM(html).window.document;
  const notes = document.querySelector('.footnotes');
  assert.ok(notes);
  assert.equal(notes.querySelectorAll('li').length, 3);
  assert.match(notes.textContent, /官方资料.*https:\/\/example.com\/report\?a=1&b=2/s);
  assert.match(notes.textContent, /第二来源.*https:\/\/example.com\/second/s);
  assert.match(notes.textContent, /https:\/\/example.com\/third/);
  assert.deepEqual([...document.querySelectorAll('.footnote-ref')].map(n => n.textContent), ['[1]', '[1]', '[2]', '[3]']);
  assert.equal(document.querySelector('a[href="#section"]')?.textContent, '页内跳转');
  assert.deepEqual([...document.querySelectorAll('img')].map(img => img.getAttribute('src')), ['./imgs/chart.png', './imgs/linked.png']);
  assert.match(document.querySelector('pre').textContent, /\[代码链接\]\(https:\/\/example.com\/ignored\)/);
  notes.remove();
  document.querySelectorAll('pre, code').forEach(node => node.remove());
  assert.doesNotMatch(document.body.textContent, /https?:\/\//);
});

test('link footnotes reuse existing Markdown footnotes and remove backlink fragments', () => {
  const { renderWechatHtml } = require('./render-pipeline.cjs');
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');
  const { JSDOM } = require('jsdom');
  const markdown = '已有注释[^source]，再引 [同一来源](https://example.com/one)，以及 [新增](https://example.com/two)。\n\n[^source]: 原始出处 [官方页面](https://example.com/one)';
  const html = renderWechatHtml(markdown, { ...DEFAULT_THEME_CONFIG, wechatLinkFootnotes: true, wechatLinkAutoAdapt: true });
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelectorAll('.footnotes').length, 1);
  assert.equal(document.querySelectorAll('.footnotes li').length, 2);
  assert.deepEqual([...document.querySelectorAll('.footnote-ref')].map(n => n.textContent), ['[1]', '[1]', '[2]']);
  assert.equal(document.querySelector('.footnote-backref'), null);
  assert.doesNotMatch(document.body.textContent, /#fn|#fnref/);
  assert.match(document.querySelector('.footnotes').textContent, /https:\/\/example.com\/one/);
});

test('link footnotes are opt-in and take priority over inline link adaptation', () => {
  const { renderWechatHtml } = require('./render-pipeline.cjs');
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');
  const { JSDOM } = require('jsdom');
  const markdown = '[链接](https://example.com/source)';
  const normal = new JSDOM(renderWechatHtml(markdown, DEFAULT_THEME_CONFIG)).window.document;
  assert.match(normal.body.textContent, /链接: https:\/\/example.com\/source/);
  assert.equal(normal.querySelector('.footnotes'), null);
  const enabled = new JSDOM(renderWechatHtml(markdown, { ...DEFAULT_THEME_CONFIG, wechatLinkFootnotes: true, wechatLinkAutoAdapt: false })).window.document;
  assert.equal(enabled.querySelector('.footnote-ref')?.textContent, '[1]');
  assert.match(enabled.querySelector('.footnotes').textContent, /https:\/\/example.com\/source/);
  const noLinks = new JSDOM(renderWechatHtml('普通正文', { ...DEFAULT_THEME_CONFIG, wechatLinkFootnotes: true })).window.document;
  assert.equal(noLinks.querySelector('.footnotes'), null);
});

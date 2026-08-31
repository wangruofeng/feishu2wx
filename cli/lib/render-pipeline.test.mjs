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

test('renderWechatHtml keeps Markdown list hanging indents and a 6px unordered marker', () => {
  const { renderWechatHtml } = require('./render-pipeline.cjs');
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');
  const { JSDOM } = require('jsdom');

  const html = renderWechatHtml('- 无序项\n\n1. 有序项', DEFAULT_THEME_CONFIG);
  const document = new JSDOM(`<body>${html}</body>`).window.document;
  const unorderedList = document.querySelector('ul');
  const unorderedItem = unorderedList?.querySelector('li');
  const bullet = unorderedItem?.querySelector('.wechat-list-bullet');
  const orderedList = document.querySelector('ol');

  assert.equal(unorderedList?.style.listStyle, 'none');
  assert.equal(unorderedList?.style.paddingLeft, '0px');
  assert.equal(unorderedItem?.style.paddingLeft, '16px');
  assert.equal(unorderedItem?.style.textIndent, '-16px');
  assert.equal(bullet?.style.width, '6px');
  assert.equal(bullet?.style.height, '6px');
  assert.equal(bullet?.style.marginRight, '10px');
  assert.equal(bullet?.textContent, '●');
  assert.equal(orderedList?.style.listStylePosition, 'outside');
  assert.equal(orderedList?.style.paddingLeft, '24px');
});

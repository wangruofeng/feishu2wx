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

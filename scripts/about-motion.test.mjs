import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const { JSDOM } = createRequire(import.meta.url)('jsdom');
const html = readFileSync(new URL('../public/about/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../public/about/about.js', import.meta.url), 'utf8');

function setup(t, { reduced = false, supported = true } = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  const animations = [];
  const preference = { matches: reduced, addEventListener: (_, fn) => { preference.onchange = fn; } };
  window.matchMedia = () => preference;
  if (supported) {
    window.Element.prototype.animate = function (frames, options) {
      const animation = { cancel() { this.cancelled = true; } };
      animations.push({ animation, frames, options });
      return animation;
    };
  }
  const details = window.document.querySelectorAll('.faq-list details')[1];
  const summary = details.querySelector('summary');
  details.style.borderTopWidth = '0px';
  details.style.borderBottomWidth = '1px';
  details.getBoundingClientRect = () => ({ height: details.open ? 181 : 61 });
  summary.getBoundingClientRect = () => ({ height: 60 });
  details.querySelector('.faq-answer').getBoundingClientRect = () => ({ height: 120 });
  window.eval(script);
  return { window, details, summary, animations, preference };
}

test('展开使用内容的自然高度，完成后保持打开并清除动画状态', (t) => {
  const { summary, details, animations } = setup(t);
  summary.click();
  assert.equal(details.open, true);
  assert.deepEqual([...animations[0].frames.height], ['61px', '181px']);
  animations[0].animation.onfinish();
  assert.equal(details.open, true);
  assert.equal(details.hasAttribute('data-animating'), false);
  assert.equal(details.style.height, '');
});

test('收起结束前保留内容参与布局，结束后恢复原生折叠状态', (t) => {
  const { summary, details, animations } = setup(t);
  summary.click();
  animations[0].animation.onfinish();
  summary.click();
  assert.equal(details.open, true);
  assert.equal(details.hasAttribute('data-closing'), true);
  assert.equal(animations[1].options.duration, 220);
  animations[1].animation.onfinish();
  assert.equal(details.open, false);
  assert.equal(details.hasAttribute('data-closing'), false);
});

test('连续点击可取消上一段并反向，最终状态跟随最后一次操作', (t) => {
  const { summary, details, animations } = setup(t);
  summary.click();
  details.getBoundingClientRect = () => ({ height: 104 });
  summary.click();
  assert.equal(animations[1].frames.height[0], '104px');
  details.getBoundingClientRect = () => ({ height: 85 });
  summary.click();
  assert.equal(animations[2].frames.height[0], '85px');
  assert.equal(animations[0].animation.cancelled, true);
  assert.equal(animations[1].animation.cancelled, true);
  animations[2].animation.onfinish();
  assert.equal(details.open, true);
  assert.equal(details.hasAttribute('data-animating'), false);
});

for (const [name, options] of [
  ['减少动态效果', { reduced: true }],
  ['浏览器不支持动画 API', { supported: false }],
]) {
  test(`${name}时使用原生折叠行为`, (t) => {
    const { summary, details, animations } = setup(t, options);
    summary.click();
    assert.equal(details.open, true);
    summary.click();
    assert.equal(details.open, false);
    assert.equal(animations.length, 0);
  });
}

test('动画中启用减少动态效果会立即落到目标状态', (t) => {
  const { summary, details, animations, preference } = setup(t);
  summary.click();
  summary.click();
  preference.matches = true;
  preference.onchange();
  assert.equal(details.open, false);
  assert.equal(animations[1].animation.cancelled, true);
  assert.equal(details.hasAttribute('data-animating'), false);
});

test('窗口尺寸变化时取消固定高度动画，保留目标状态', (t) => {
  const { window, summary, details, animations } = setup(t);
  summary.click();
  window.dispatchEvent(new window.Event('resize'));
  assert.equal(details.open, true);
  assert.equal(animations[0].animation.cancelled, true);
  assert.equal(details.hasAttribute('data-animating'), false);
  assert.equal(details.style.height, '');
});

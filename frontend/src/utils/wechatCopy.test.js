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

const { JSDOM } = require('jsdom');

let tsRegistered = false;
let domReady = false;

function registerTypeScript() {
  if (tsRegistered) return;
  require('ts-node').register({
    transpileOnly: true,
    skipProject: true,
    compilerOptions: {
      module: 'commonjs',
      moduleResolution: 'node',
      target: 'ES2020',
      jsx: 'react-jsx',
      esModuleInterop: true,
      skipLibCheck: true,
    },
  });
  tsRegistered = true;
}

function setupDomRuntime() {
  if (domReady && global.document) return;

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://feishu2wx.local/',
    pretendToBeVisual: true,
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.Node = dom.window.Node;
  global.NodeFilter = dom.window.NodeFilter;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLImageElement = dom.window.HTMLImageElement;
  global.HTMLBRElement = dom.window.HTMLBRElement;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  global.atob = global.atob || dom.window.atob.bind(dom.window);
  global.btoa = global.btoa || dom.window.btoa.bind(dom.window);
  domReady = true;
}

function renderWechatHtml(markdown, config) {
  setupDomRuntime();
  registerTypeScript();

  const {
    renderMarkdown,
    setCodeBlockStyle,
    setShowHorizontalRule,
  } = require('../../src/utils/markdownRenderer.ts');
  const { formatForWeChat } = require('../../src/utils/wechatCopy.ts');

  setCodeBlockStyle(config.codeBlockStyle);
  setShowHorizontalRule(config.showHorizontalRule);

  const previewHtml = renderMarkdown(markdown);
  return formatForWeChat(
    previewHtml,
    config.theme,
    config.font,
    config.showH1Underline,
    config.imageBorderStyle,
    config.imageBorderRadius,
    config.codeBlockStyle,
    config.invertH1,
    config.invertH2,
    config.alignH2Left,
    config.showBlockquoteBg,
    config.blockquoteColorMode,
    config.blockquoteHeightMode,
    config.blockquoteBackgroundMode,
    config.textAlignMode
  );
}

module.exports = {
  renderWechatHtml,
  setupDomRuntime,
};

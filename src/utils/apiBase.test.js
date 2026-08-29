import { resolveApiBase } from './apiBase';

describe('resolveApiBase', () => {
  it('未配置时使用同源相对路径', () => {
    expect(resolveApiBase('', 'feishu2wx.wangruofeng007.com')).toBe('');
  });

  it('GitHub Pages 部署保留指向 Cloudflare 后端的绝对地址', () => {
    expect(resolveApiBase('https://feishu2wx.wangruofeng007.com', 'wangruofeng007.github.io'))
      .toBe('https://feishu2wx.wangruofeng007.com');
  });

  it('配置域名与当前页面同域时回退为相对路径以携带会话 cookie', () => {
    expect(resolveApiBase('https://feishu2wx.wangruofeng007.com', 'feishu2wx.wangruofeng007.com')).toBe('');
  });

  it('自定义域名上误配 pages.dev 地址时回退为相对路径', () => {
    expect(resolveApiBase('https://feishu2wx-b4h.pages.dev', 'feishu2wx.wangruofeng007.com')).toBe('');
  });

  it('pages.dev 预览域名之间的跨域地址保持原样', () => {
    expect(resolveApiBase('https://feishu2wx-b4h.pages.dev', 'other.pages.dev'))
      .toBe('https://feishu2wx-b4h.pages.dev');
  });

  it('非法 URL 原样返回，交由 fetch 暴露配置错误', () => {
    expect(resolveApiBase('not-a-url', 'feishu2wx.wangruofeng007.com')).toBe('not-a-url');
  });
});

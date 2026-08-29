/*
 * 后端 API 基础地址解析：
 * - GitHub Pages 静态部署通过构建变量 REACT_APP_API_URL 指向 Cloudflare 后端域名；
 * - Cloudflare Pages 自有部署必须同源访问 API（跨域请求不携带会话 cookie，登录态会丢失）。
 *   构建变量与当前页面同域、或误指向 *.pages.dev 而页面在自定义域名上时，回退为同源相对路径。
 */
export function resolveApiBase(configuredBase: string, currentHost: string): string {
  if (!configuredBase) return '';
  let configuredHost: string;
  try {
    configuredHost = new URL(configuredBase).host;
  } catch {
    return configuredBase;
  }
  if (configuredHost === currentHost) return '';
  if (configuredHost.endsWith('.pages.dev') && !currentHost.endsWith('.pages.dev')) return '';
  return configuredBase;
}

export const API_BASE = resolveApiBase(process.env.REACT_APP_API_URL || '', window.location.host);

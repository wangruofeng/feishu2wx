module.exports = function (app) {
  // 仅在 npm run dev（Express 后端）模式下启用代理
  // cf:dev 模式下 wrangler 自行处理 API 路由，不需要 CRA 代理
  if (process.env.CF_DEV !== '1') {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use(
      '/api',
      createProxyMiddleware({
        target: 'http://localhost:3101',
        changeOrigin: true,
      })
    );
  }
};

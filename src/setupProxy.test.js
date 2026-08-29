jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn((options) => options),
}));

const { createProxyMiddleware } = require('http-proxy-middleware');
const configureProxy = require('./setupProxy');

test('returns a local development instruction when the Express API is unavailable', () => {
  const app = { use: jest.fn() };
  const response = { writeHead: jest.fn(), end: jest.fn() };
  const previousCfDev = process.env.CF_DEV;
  delete process.env.CF_DEV;
  createProxyMiddleware.mockImplementation((options) => options);

  try {
    configureProxy(app);
    const options = app.use.mock.calls[0][1];
    options.onError(new Error('connect ECONNREFUSED'), {}, response);

    expect(response.writeHead).toHaveBeenCalledWith(503, { 'Content-Type': 'application/json; charset=utf-8' });
    expect(response.end).toHaveBeenCalledWith(JSON.stringify({
      error: '本地 API 服务未启动。请停止当前进程后运行 npm run dev。',
    }));
  } finally {
    if (previousCfDev === undefined) delete process.env.CF_DEV;
    else process.env.CF_DEV = previousCfDev;
  }
});

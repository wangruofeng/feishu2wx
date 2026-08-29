import { Router, Request, Response } from 'express';
import { handleAiChat } from '../lib/ai-handler';

const router = Router();

// POST /api/ai/chat — SSE 流式转发
router.post('/chat', async (req: Request, res: Response) => {
  const clientAbort = new AbortController();
  // 注意：Node 16+ 中 req 的 'close' 在请求体读完后即触发，
  // 必须监听 res 并区分“响应已正常结束”与“客户端提前断开”
  res.on('close', () => {
    if (!res.writableEnded) clientAbort.abort();
  });

  const response = await handleAiChat(req.body, { signal: clientAbort.signal });
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.ok || !response.body) {
    // 错误响应是普通 JSON，完整写出后再结束
    res.send(await response.text());
    return;
  }
  res.flushHeaders();

  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } catch {
    // 客户端断开
  } finally {
    res.end();
  }
});

export default router;

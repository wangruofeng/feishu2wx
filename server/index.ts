import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import configRouter from './routes/config';
import publishRouter from './routes/publish';

const app = express();
const PORT = process.env.PORT || 3101;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3100',
}));
app.use(express.json({ limit: '50mb' }));

app.use('/api/config', configRouter);
app.use('/api/publish', publishRouter);

app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, next: NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({ error: '文章内容过大，请压缩图片后重试' });
    return;
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

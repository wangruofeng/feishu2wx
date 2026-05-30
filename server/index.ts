import express from 'express';
import cors from 'cors';
import configRouter from './routes/config';
import publishRouter from './routes/publish';

const app = express();
const PORT = process.env.PORT || 3101;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3100',
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/config', configRouter);
app.use('/api/publish', publishRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

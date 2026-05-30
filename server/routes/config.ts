import { Router, Request, Response } from 'express';
import { handleGetConfig, handleSaveConfig, handleDeleteConfig } from '../lib/config-handlers';
import { FileConfigStore } from '../lib/config-file';

const router = Router();
const store = new FileConfigStore();

// GET /api/config
router.get('/', async (_req: Request, res: Response) => {
  const response = await handleGetConfig(store);
  const data = await response.json();
  res.status(response.status).json(data);
});

// POST /api/config
router.post('/', async (req: Request, res: Response) => {
  const response = await handleSaveConfig(store, req.body);
  const data = await response.json();
  res.status(response.status).json(data);
});

// DELETE /api/config
router.delete('/', async (_req: Request, res: Response) => {
  const response = await handleDeleteConfig(store);
  const data = await response.json();
  res.status(response.status).json(data);
});

export default router;

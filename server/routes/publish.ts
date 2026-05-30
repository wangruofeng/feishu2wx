import { Router, Request, Response } from 'express';
import { handlePublishDraft } from '../lib/publish-handler';
import { FileConfigStore } from '../lib/config-file';

const router = Router();
const store = new FileConfigStore();

// POST /api/publish/draft
router.post('/draft', async (req: Request, res: Response) => {
  const response = await handlePublishDraft(store, req.body);
  const data = await response.json();
  res.status(response.status).json(data);
});

export default router;

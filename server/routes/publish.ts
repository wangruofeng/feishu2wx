import { Router, Request, Response } from 'express';
import { handlePublishDraft } from '../lib/publish-handler';

const router = Router();

// POST /api/publish/draft
router.post('/draft', async (req: Request, res: Response) => {
  const response = await handlePublishDraft(req.body);
  const data = await response.json();
  res.status(response.status).json(data);
});

export default router;
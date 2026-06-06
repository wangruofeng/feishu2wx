import { createPublishDraftHandler } from './publish-handler';
import * as wechat from './wechat-worker';

export const handlePublishDraft = createPublishDraftHandler(wechat);

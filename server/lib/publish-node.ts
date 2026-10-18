import { createPublishDraftHandler } from './publish-handler';
import * as wechat from './wechat-worker';
import { normalizeCoverImage } from './cover-normalizer-node';

export const handlePublishDraft = createPublishDraftHandler(wechat, normalizeCoverImage);

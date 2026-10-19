import { handleAiChat } from '../../../server/lib/ai-handler';
import { aiRequestOptions, handleAiProviderRequest, type AiPagesContext } from '../../lib/ai-request';

export const onRequestOptions: PagesFunction = async context => aiRequestOptions(context as unknown as AiPagesContext);
export const onRequestPost: PagesFunction = async context => handleAiProviderRequest(
  context as unknown as AiPagesContext, handleAiChat, 16 * 1024 * 1024,
);

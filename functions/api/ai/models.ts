import { handleAiModels } from '../../../server/lib/ai-models-handler';
import { aiRequestOptions, handleAiProviderRequest, type AiPagesContext } from '../../lib/ai-request';

export const onRequestOptions: PagesFunction = async context => aiRequestOptions(context as unknown as AiPagesContext);
export const onRequestPost: PagesFunction = async context => handleAiProviderRequest(
  context as unknown as AiPagesContext, handleAiModels, 64 * 1024,
);

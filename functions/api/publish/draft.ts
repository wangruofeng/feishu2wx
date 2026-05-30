import { handlePublishDraft } from '../../../server/lib/publish-handler';
import { KVConfigStore } from '../../../server/lib/config-kv';

export const onRequestPost: PagesFunction<{ CONFIG_KV: KVNamespace }> = async (context) => {
  const body = await context.request.json();
  return handlePublishDraft(new KVConfigStore(context.env.CONFIG_KV), body as {
    title?: string;
    content?: string;
    author?: string;
    coverDataUrl?: string;
  });
};
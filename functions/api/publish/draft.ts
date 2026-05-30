import { handlePublishDraft } from '../../../server/lib/publish-handler';
import { KVConfigStore } from '../../../server/lib/config-kv';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<{ CONFIG_KV: KVNamespace }> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction<{ CONFIG_KV: KVNamespace }> = async (context) => {
  const body = await context.request.json();
  return handlePublishDraft(new KVConfigStore(context.env.CONFIG_KV), body as {
    title?: string;
    content?: string;
    author?: string;
    coverDataUrl?: string;
  });
};
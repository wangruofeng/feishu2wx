import { handlePublishDraft } from '../../../server/lib/publish-handler';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction = async (context) => {
  const body = await context.request.json();
  return handlePublishDraft(body as {
    title?: string;
    content?: string;
    author?: string;
    coverDataUrl?: string;
    appId?: string;
    appSecret?: string;
  });
};
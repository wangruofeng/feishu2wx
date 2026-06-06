import { handlePublishDraft } from '../../../server/lib/publish-handler';

function getCorsOrigin(): string {
  return (globalThis as any).ALLOWED_ORIGIN || '*';
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
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
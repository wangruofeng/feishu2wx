import { handleGetConfig, handleSaveConfig, handleDeleteConfig, jsonResponse } from '../../server/lib/config-handlers';
import { KVConfigStore } from '../../server/lib/config-kv';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<{ CONFIG_KV: KVNamespace }> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet: PagesFunction<{ CONFIG_KV: KVNamespace }> = async (context) => {
  return handleGetConfig(new KVConfigStore(context.env.CONFIG_KV));
};

export const onRequestPost: PagesFunction<{ CONFIG_KV: KVNamespace }> = async (context) => {
  const body = await context.request.json();
  return handleSaveConfig(new KVConfigStore(context.env.CONFIG_KV), body as { appId?: string; appSecret?: string });
};

export const onRequestDelete: PagesFunction<{ CONFIG_KV: KVNamespace }> = async (context) => {
  return handleDeleteConfig(new KVConfigStore(context.env.CONFIG_KV));
};
import { handleGetConfig, handleSaveConfig, handleDeleteConfig } from '../../server/lib/config-handlers';
import { KVConfigStore } from '../../server/lib/config-kv';

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

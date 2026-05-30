import { ConfigStore, maskSecret } from './config-store';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export async function handleGetConfig(store: ConfigStore): Promise<Response> {
  try {
    const config = await store.get();
    if (config) {
      return jsonResponse({
        configured: true,
        appId: config.appId,
        appSecret: maskSecret(config.appSecret),
      });
    }
    return jsonResponse({ configured: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取配置失败';
    return jsonResponse({ error: message }, 500);
  }
}

export async function handleSaveConfig(
  store: ConfigStore,
  body: { appId?: string; appSecret?: string }
): Promise<Response> {
  const { appId, appSecret } = body;
  if (!appId || !appSecret) {
    return jsonResponse({ error: 'AppID 和 AppSecret 不能为空' }, 400);
  }
  try {
    await store.save({ appId, appSecret });
    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存配置失败';
    return jsonResponse({ error: message }, 500);
  }
}

export async function handleDeleteConfig(store: ConfigStore): Promise<Response> {
  try {
    await store.delete();
    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除配置失败';
    return jsonResponse({ error: message }, 500);
  }
}

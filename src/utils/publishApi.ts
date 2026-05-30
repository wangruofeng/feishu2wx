const API_BASE = process.env.REACT_APP_API_URL || '';
const LOCAL_CONFIG_KEY = 'feishu2wx_wechat_config';

export interface WechatConfigStatus {
  configured: boolean;
  appId?: string;
  appSecret?: string;
}

function getLocalWechatConfig(): { appId: string; appSecret: string } | null {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function fetchWechatConfig(): Promise<WechatConfigStatus> {
  const local = getLocalWechatConfig();

  try {
    const res = await fetch(`${API_BASE}/api/config`);
    if (res.ok) {
      const data = await res.json();
      return {
        configured: !!local || data.configured,
        appId: local?.appId || data.appId,
      };
    }
  } catch {
    // 后端不可用时（非所有者用户），只使用本地配置
  }

  return {
    configured: !!local,
    appId: local?.appId,
  };
}

export async function saveWechatConfig(appId: string, appSecret: string): Promise<{ success: boolean; error?: string }> {
  // 始终保存到 localStorage（所有用户）
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify({ appId, appSecret }));

  // 尝试同步到服务器（所有者用户通过 Cloudflare KV 持久化）
  try {
    const res = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appSecret }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.warn('服务端保存失败（非所有者用户可忽略）:', data.error);
    }
  } catch {
    // 后端不可用，本地保存已足够
  }

  return { success: true };
}

export async function deleteWechatConfig(): Promise<void> {
  localStorage.removeItem(LOCAL_CONFIG_KEY);

  try {
    await fetch(`${API_BASE}/api/config`, { method: 'DELETE' });
  } catch {
    // 后端不可用
  }
}

export interface PublishParams {
  title: string;
  content: string;
  author?: string;
  coverDataUrl?: string;
}

export async function publishToDraft(params: PublishParams): Promise<{
  success: boolean;
  mediaId?: string;
  message?: string;
  error?: string;
}> {
  try {
    // 将本地凭证随请求发送
    const local = getLocalWechatConfig();
    const body: Record<string, unknown> = { ...params };
    if (local) {
      body.appId = local.appId;
      body.appSecret = local.appSecret;
    }

    const res = await fetch(`${API_BASE}/api/publish/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || '推送失败' };
    return data;
  } catch {
    return { success: false, error: '网络错误，请检查后端服务是否启动' };
  }
}
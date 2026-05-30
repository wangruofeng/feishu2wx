const API_BASE = process.env.REACT_APP_API_URL || '';
const LOCAL_CONFIG_KEY = 'feishu2wx_wechat_config';

export interface WechatConfigStatus {
  configured: boolean;
  appId?: string;
}

export async function fetchWechatConfig(): Promise<WechatConfigStatus> {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return { configured: false };
    const config = JSON.parse(raw);
    return { configured: true, appId: config.appId };
  } catch {
    return { configured: false };
  }
}

export async function saveWechatConfig(appId: string, appSecret: string): Promise<{ success: boolean }> {
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify({ appId, appSecret }));
  return { success: true };
}

export async function deleteWechatConfig(): Promise<void> {
  localStorage.removeItem(LOCAL_CONFIG_KEY);
}

function getLocalCredentials(): { appId: string; appSecret: string } | null {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
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
  const credentials = getLocalCredentials();
  if (!credentials) {
    return { success: false, error: '请先配置公众号 AppID 和 AppSecret' };
  }

  try {
    const res = await fetch(`${API_BASE}/api/publish/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        appId: credentials.appId,
        appSecret: credentials.appSecret,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || '推送失败' };
    return data;
  } catch {
    return { success: false, error: '网络错误，请检查后端服务是否启动' };
  }
}
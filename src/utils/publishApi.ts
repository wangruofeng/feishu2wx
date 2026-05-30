const API_BASE = process.env.REACT_APP_API_URL || '';

export interface WechatConfigStatus {
  configured: boolean;
  appId?: string;
  appSecret?: string;
}

export async function fetchWechatConfig(): Promise<WechatConfigStatus> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error('获取配置失败');
  return res.json();
}

export async function saveWechatConfig(appId: string, appSecret: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, appSecret }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || '保存失败' };
  return { success: true };
}

export async function deleteWechatConfig(): Promise<void> {
  await fetch(`${API_BASE}/api/config`, { method: 'DELETE' });
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
    const res = await fetch(`${API_BASE}/api/publish/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || '推送失败' };
    return data;
  } catch {
    return { success: false, error: '网络错误，请检查后端服务是否启动' };
  }
}

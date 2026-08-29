import { requireSession, type PagesAuthEnv } from '../../lib/auth';
import { loadCloudConfig, mergeConfig, saveCloudConfig, withoutKeys, type CloudConfig } from '../../lib/cloud-ai-config';

export const onRequestGet: PagesFunction<PagesAuthEnv> = async (context) => {
  const session = await requireSession(context.request, context.env); if (session instanceof Response) return session;
  return Response.json(withoutKeys(await loadCloudConfig(session.sub, context.env)), { headers: { 'Cache-Control': 'no-store' } });
};
export const onRequestPut: PagesFunction<PagesAuthEnv> = async (context) => {
  const session = await requireSession(context.request, context.env); if (session instanceof Response) return session;
  try { const config = mergeConfig(await loadCloudConfig(session.sub, context.env), await context.request.json() as CloudConfig); await saveCloudConfig(session.sub, config, context.env); return Response.json(withoutKeys(config)); } catch { return Response.json({ error: '配置格式无效。' }, { status: 400 }); }
};
export const onRequestDelete: PagesFunction<PagesAuthEnv> = async (context) => {
  const session = await requireSession(context.request, context.env); if (session instanceof Response) return session;
  await context.env.AI_CONFIGS_KV.delete(`ai-config:v1:${session.sub}`); return new Response(null, { status: 204 });
};

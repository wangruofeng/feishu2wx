import { getSession, type PagesAuthEnv } from '../../lib/auth';
export const onRequestGet: PagesFunction<PagesAuthEnv> = async (context) => {
  const session = await getSession(context.request, context.env);
  return Response.json({ user: session ? { login: session.login, avatarUrl: session.avatarUrl } : null }, { headers: { 'Cache-Control': 'no-store' } });
};

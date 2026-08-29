import { signSession, verifySession, type AuthEnv, type SessionPayload } from './auth-crypto';

export interface PagesAuthEnv extends AuthEnv {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  AI_CONFIGS_KV: KVNamespace;
}

const COOKIE_NAME = 'feishu2wx_session';
const STATE_COOKIE = 'feishu2wx_oauth_state';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function getCookie(request: Request, name: string): string | undefined {
  return request.headers.get('Cookie')?.split(/;\s*/).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function getSession(request: Request, env: AuthEnv): Promise<SessionPayload | null> {
  return verifySession(getCookie(request, COOKIE_NAME), env);
}

export async function requireSession(request: Request, env: AuthEnv): Promise<SessionPayload | Response> {
  const session = await getSession(request, env);
  return session ?? Response.json({ error: '请先登录 GitHub。' }, { status: 401 });
}

export async function sessionCookie(session: SessionPayload, env: AuthEnv): Promise<string> {
  return `${COOKIE_NAME}=${await signSession(session, env)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function startOAuth(request: Request, env: PagesAuthEnv): Response {
  const state = crypto.randomUUID();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', new URL('/api/auth/github/callback', request.url).toString());
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Set-Cookie': `${STATE_COOKIE}=${state}; Path=/api/auth/github/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax` } });
}

export async function completeOAuth(request: Request, env: PagesAuthEnv): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.get('state') !== getCookie(request, STATE_COOKIE)) return new Response('GitHub 登录校验失败。', { status: 400 });
  const missing = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'AUTH_SESSION_SIGNING_KEY'].filter((name) => !env[name as keyof PagesAuthEnv]);
  if (missing.length) return new Response(`GitHub 登录服务缺少生产环境 Secret：${missing.join('、')}。请在 Cloudflare Pages Production 环境补充后重新部署。`, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  let token: { access_token?: string };
  try {
    const tokenBody = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL('/api/auth/github/callback', request.url).toString(),
    });
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'feishu2wx' }, body: tokenBody.toString() });
    token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) return new Response('GitHub 授权码交换失败。请确认 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 与 OAuth App 匹配，然后重新发起登录。', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('无法连接 GitHub 授权服务。请稍后重试；若持续发生，请检查 Workers 出站网络与 GitHub 状态。', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  let user: { id?: number; login?: string; avatar_url?: string };
  try {
    const userResponse = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json' } });
    user = await userResponse.json() as typeof user;
    if (!userResponse.ok || !user.id || !user.login) return new Response('GitHub 用户信息读取失败。请重新授权；若持续发生，请检查 OAuth App 权限是否包含 read:user。', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('无法连接 GitHub 用户信息服务。请稍后重新登录。', { status: 502 }); }
  try {
    const session: SessionPayload = { sub: String(user.id), login: user.login!, avatarUrl: user.avatar_url ?? '', exp: Date.now() + SESSION_SECONDS * 1000 };
    return new Response(null, { status: 302, headers: { Location: new URL('/', request.url).toString(), 'Set-Cookie': await sessionCookie(session, env), 'Cache-Control': 'no-store' } });
  } catch { return new Response('无法创建登录会话：AUTH_SESSION_SIGNING_KEY 必须是独立的 32 字节 base64url 值。请重新生成、覆盖 Production Secret 并重新部署。', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}

export function clearSessionCookie(): string { return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }

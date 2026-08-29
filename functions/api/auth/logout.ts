import { clearSessionCookie } from '../../lib/auth';
export const onRequestPost: PagesFunction = async () => new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } });

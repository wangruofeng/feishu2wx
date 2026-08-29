import { startOAuth, type PagesAuthEnv } from '../../lib/auth';
export const onRequestGet: PagesFunction<PagesAuthEnv> = async (context) => startOAuth(context.request, context.env);

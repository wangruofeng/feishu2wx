import { completeOAuth, type PagesAuthEnv } from '../../../lib/auth';
export const onRequestGet: PagesFunction<PagesAuthEnv> = async (context) => completeOAuth(context.request, context.env);

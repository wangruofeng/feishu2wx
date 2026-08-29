const encoder = new TextEncoder();

export interface AuthEnv {
  AI_CONFIG_ENCRYPTION_KEY: string;
  AUTH_SESSION_SIGNING_KEY: string;
}

export interface SessionPayload {
  sub: string;
  login: string;
  avatarUrl: string;
  exp: number;
}

export interface EncryptedValue { v: 1; iv: string; ciphertext: string; }

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importKey(value: string, algorithm: 'AES-GCM' | 'HMAC', usages: KeyUsage[]) {
  const raw = fromBase64Url(value);
  if (raw.byteLength !== 32) throw new Error('密钥长度无效。');
  return crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, algorithm === 'AES-GCM' ? { name: algorithm } : { name: algorithm, hash: 'SHA-256' }, false, usages);
}

export async function encryptConfig(value: string, userId: string, env: AuthEnv): Promise<EncryptedValue> {
  const key = await importKey(env.AI_CONFIG_ENCRYPTION_KEY, 'AES-GCM', ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, additionalData: encoder.encode(`ai-config:v1:${userId}`).buffer as ArrayBuffer }, key, encoder.encode(value).buffer as ArrayBuffer);
  return { v: 1, iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ciphertext)) };
}

export async function decryptConfig(value: EncryptedValue, userId: string, env: AuthEnv): Promise<string> {
  if (value.v !== 1) throw new Error('不支持的配置版本。');
  const key = await importKey(env.AI_CONFIG_ENCRYPTION_KEY, 'AES-GCM', ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(value.iv).buffer as ArrayBuffer, additionalData: encoder.encode(`ai-config:v1:${userId}`).buffer as ArrayBuffer }, key, fromBase64Url(value.ciphertext).buffer as ArrayBuffer);
  return new TextDecoder().decode(plaintext);
}

export async function signSession(payload: SessionPayload, env: AuthEnv): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(env.AUTH_SESSION_SIGNING_KEY, 'HMAC', ['sign']);
  return `${body}.${toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body).buffer as ArrayBuffer)))}`;
}

export async function verifySession(token: string | undefined, env: AuthEnv, now = Date.now()): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature, ...extra] = token.split('.');
  if (!body || !signature || extra.length) return null;
  try {
    const key = await importKey(env.AUTH_SESSION_SIGNING_KEY, 'HMAC', ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, fromBase64Url(signature).buffer as ArrayBuffer, encoder.encode(body).buffer as ArrayBuffer)) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    return payload.sub && payload.login && payload.exp > now ? payload : null;
  } catch { return null; }
}

export interface WechatConfig {
  appId: string;
  appSecret: string;
}

export interface ConfigStore {
  get(): Promise<WechatConfig | null>;
  save(config: WechatConfig): Promise<void>;
  delete(): Promise<void>;
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

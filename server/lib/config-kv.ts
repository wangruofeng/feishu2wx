import { ConfigStore, WechatConfig } from './config-store';

const KV_KEY = 'wechat_config';

export class KVConfigStore implements ConfigStore {
  constructor(private kv: KVNamespace) {}

  async get(): Promise<WechatConfig | null> {
    const raw = await this.kv.get(KV_KEY, 'text');
    return raw ? JSON.parse(raw) : null;
  }

  async save(config: WechatConfig): Promise<void> {
    await this.kv.put(KV_KEY, JSON.stringify(config));
  }

  async delete(): Promise<void> {
    await this.kv.delete(KV_KEY);
  }
}

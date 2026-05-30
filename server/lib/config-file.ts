import fs from 'fs/promises';
import path from 'path';
import { ConfigStore, WechatConfig } from './config-store';

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

export class FileConfigStore implements ConfigStore {
  async get(): Promise<WechatConfig | null> {
    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw) as WechatConfig;
    } catch {
      return null;
    }
  }

  async save(config: WechatConfig): Promise<void> {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(CONFIG_PATH);
    } catch {
      // 文件不存在时忽略
    }
  }
}

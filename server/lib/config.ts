import { FileConfigStore } from './config-file';
import type { WechatConfig } from './config-store';

export type { WechatConfig };
export { maskSecret } from './config-store';

const store = new FileConfigStore();

export const getConfig = () => store.get();
export const saveConfig = (config: WechatConfig) => store.save(config);
export const deleteConfig = () => store.delete();

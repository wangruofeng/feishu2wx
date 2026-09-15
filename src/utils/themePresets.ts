export type ThemePresetKey = 'classic' | 'orange' | 'blue' | 'teal';

export const THEME_PRESETS = [
  { key: 'classic', name: '经典', color: '#000000e6' },
  { key: 'orange', name: '橙色', color: '#FD4606' },
  { key: 'blue', name: '蓝色', color: '#0F4C81' },
  { key: 'teal', name: '青绿', color: '#0D9488' },
] as const satisfies ReadonlyArray<{
  key: ThemePresetKey;
  name: string;
  color: string;
}>;

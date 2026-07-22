export type MarkerHighlightColor = 'purple' | 'yellow' | 'green' | 'blue' | 'pink';

export const markerHighlightOptions: Array<{
  key: MarkerHighlightColor;
  label: string;
  color: string;
}> = [
  { key: 'purple', label: '紫色', color: 'rgba(108, 92, 231, 0.2)' },
  { key: 'yellow', label: '黄色', color: 'rgba(255, 193, 7, 0.28)' },
  { key: 'green', label: '绿色', color: 'rgba(46, 204, 113, 0.22)' },
  { key: 'blue', label: '蓝色', color: 'rgba(52, 152, 219, 0.22)' },
  { key: 'pink', label: '粉色', color: 'rgba(255, 105, 180, 0.22)' },
];

export function isMarkerHighlightColor(value: string | null): value is MarkerHighlightColor {
  return markerHighlightOptions.some((option) => option.key === value);
}

export function getMarkerHighlightColor(key: MarkerHighlightColor): string {
  return markerHighlightOptions.find((option) => option.key === key)?.color || markerHighlightOptions[0].color;
}

export function getMarkerHighlightGradient(key: MarkerHighlightColor): string {
  return `linear-gradient(to top,${getMarkerHighlightColor(key).replace(/\s/g, '')} 40%,transparent 40%)`;
}

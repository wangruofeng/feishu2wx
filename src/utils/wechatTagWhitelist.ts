export const WECHAT_SAFE_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'span',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'section',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'sup',
  'sub',
] as const;

export const WECHAT_UNSTABLE_HTML_TAGS = [
  'figure',
  'figcaption',
  'div',
  'pre',
  'code',
] as const;

export const WECHAT_UNSUPPORTED_HTML_TAGS = [
  'script',
  'style',
  'iframe',
  'form',
  'input',
  'video',
  'audio',
  'canvas',
] as const;

export const WECHAT_IMAGE_WRAPPER_TAG = 'section';
export const WECHAT_IMAGE_CAPTION_TAG = 'p';

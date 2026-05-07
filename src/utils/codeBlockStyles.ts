export const modernCodeBlockStyles = {
  preBackgroundColor: '#282c34',
  headerBackgroundColor: '#21252b',
  codeTextColor: '#abb2bf',
  borderRadius: '8px',
  codePadding: '16px',
  headerPadding: '10px 16px',
  dotSize: '12px',
  dotGap: '6px',
  fontSize: '14px',
  lineHeight: '1.5',
  redDotColor: '#ff5f56',
  orangeDotColor: '#ffbd2e',
  greenDotColor: '#27c93f',
} as const;

export function getModernCodeBlockCssVars(): Record<string, string> {
  return {
    '--modern-code-block-bg': modernCodeBlockStyles.preBackgroundColor,
    '--modern-code-block-header-bg': modernCodeBlockStyles.headerBackgroundColor,
    '--modern-code-block-text-color': modernCodeBlockStyles.codeTextColor,
    '--modern-code-block-radius': modernCodeBlockStyles.borderRadius,
    '--modern-code-block-code-padding': modernCodeBlockStyles.codePadding,
    '--modern-code-block-header-padding': modernCodeBlockStyles.headerPadding,
    '--modern-code-block-dot-size': modernCodeBlockStyles.dotSize,
    '--modern-code-block-dot-gap': modernCodeBlockStyles.dotGap,
    '--modern-code-block-font-size': modernCodeBlockStyles.fontSize,
    '--modern-code-block-line-height': modernCodeBlockStyles.lineHeight,
    '--modern-code-block-dot-red': modernCodeBlockStyles.redDotColor,
    '--modern-code-block-dot-orange': modernCodeBlockStyles.orangeDotColor,
    '--modern-code-block-dot-green': modernCodeBlockStyles.greenDotColor,
  };
}

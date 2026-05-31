import React, { forwardRef } from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体，映射到项目中已有的 CSS 类名，不改变原始样式 */
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'danger' | 'tab'
    | 'toggle' | 'toolbar' | 'toolbarPrimary' | 'footer' | 'themeOption'
    | 'wechatConfig' | 'settingsTrigger' | 'publishClose' | 'wcDialogClose'
    | 'publishBtnCancel' | 'publishBtnPrimary'
    | 'wcDialogBtnCancel' | 'wcDialogBtnSave' | 'wcDialogBtnDanger'
    | 'imageViewerClose' | 'imageViewerArrow' | 'editorToolbar'
    | 'deviceBtn';
  /** toggle/ghost/themeOption/tab 变体支持 active 状态 */
  active?: boolean;
}

/** 变体 → 原始 CSS 类名映射 */
const variantClassMap: Record<string, string> = {
  default: 'edit-toggle-btn',
  primary: 'copy-btn',
  outline: 'publish-btn-top',
  ghost: 'preview-header-btn',
  danger: 'wc-dialog-btn--danger',
  tab: 'mobile-tab',
  toggle: 'settings-toggle',
  toolbar: 'toolbar-btn',
  toolbarPrimary: 'toolbar-btn toolbar-btn-primary',
  footer: 'editor-footer-btn',
  themeOption: 'theme-option',
  wechatConfig: 'wechat-config-btn',
  settingsTrigger: 'settings-trigger',
  publishClose: 'publish-close',
  wcDialogClose: 'wc-dialog-close',
  publishBtnCancel: 'publish-btn publish-btn--cancel',
  publishBtnPrimary: 'publish-btn publish-btn--primary',
  wcDialogBtnCancel: 'wc-dialog-btn wc-dialog-btn--cancel',
  wcDialogBtnSave: 'wc-dialog-btn wc-dialog-btn--save',
  wcDialogBtnDanger: 'wc-dialog-btn wc-dialog-btn--danger',
  imageViewerClose: 'image-viewer-close',
  imageViewerArrow: 'image-viewer-arrow',
  deviceBtn: 'device-btn',
  editorToolbar: '', // 无独立类名，由 .editor-toolbar button 祖先选择器控制
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', active = false, className = '', children, ...rest }, ref) => {
    const baseClass = variantClassMap[variant] || '';
    const activeClass = active ? 'active' : '';
    const classes = [baseClass, activeClass, className].filter(Boolean).join(' ');

    return (
      <button ref={ref} className={classes} {...rest}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
// 保留原生 details 的键盘与无脚本行为，只增强展开/收起的视觉连续性。
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const settleAnimations = [];

  document.querySelectorAll('.faq-list details').forEach((details) => {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('.faq-answer');
    let animation = null;
    let expanded = details.open;

    const settle = () => {
      if (!animation) return;
      animation.cancel();
      animation = null;
      details.open = expanded;
      delete details.dataset.animating;
      delete details.dataset.closing;
    };

    summary.addEventListener('click', (event) => {
      if (event.defaultPrevented || reducedMotion.matches || !details.animate) return;
      event.preventDefault();

      // 先读取当前帧，再取消上一段；快速点击会从当前位置平滑反向。
      const startHeight = details.getBoundingClientRect().height;
      if (!animation) expanded = details.open;
      animation?.cancel();
      expanded = !expanded;
      details.open = true;
      details.dataset.animating = 'true';
      details.toggleAttribute('data-closing', !expanded);

      const style = getComputedStyle(details);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const endHeight = summary.getBoundingClientRect().height
        + (expanded ? answer.getBoundingClientRect().height : 0) + borders;

      animation = details.animate(
        { height: [`${startHeight}px`, `${endHeight}px`] },
        { duration: expanded ? 280 : 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
      animation.onfinish = settle;
    });

    settleAnimations.push(settle);
  });

  // 尺寸或偏好变化时回到自然高度，避免窄屏换行后被旧高度裁剪。
  window.addEventListener('resize', () => settleAnimations.forEach((settle) => settle()));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) settleAnimations.forEach((settle) => settle());
  });
})();

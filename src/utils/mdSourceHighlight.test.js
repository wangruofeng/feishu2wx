import {
  tokenizeMarkdown,
  getMdSyntaxCssVars,
  mdSyntaxThemes,
} from './mdSourceHighlight';

// 工具：从高亮 HTML 中按 class 提取纯文本（经 DOM 解码实体）
function textInClass(html, cls) {
  const container = document.createElement('div');
  container.innerHTML = html;
  let out = '';
  container.querySelectorAll(`.${cls}`).forEach((el) => {
    out += el.textContent;
  });
  return out;
}

describe('tokenizeMarkdown 行级元素', () => {
  test('ATX 标题整行着色为 heading', () => {
    const html = tokenizeMarkdown('# 标题');
    expect(html).toContain('md-tok-heading');
    expect(textInClass(html, 'md-tok-heading')).toBe('# 标题');
  });

  test('H2-H6 同样识别为标题', () => {
    expect(tokenizeMarkdown('## 二级')).toContain('md-tok-heading');
    expect(tokenizeMarkdown('###### 六级')).toContain('md-tok-heading');
  });

  test('# 后无空格不算标题', () => {
    const html = tokenizeMarkdown('#tag');
    expect(html).not.toContain('md-tok-heading');
  });

  test('引用块前缀着色为 quote，内容部分做行内解析', () => {
    const html = tokenizeMarkdown('> 引用 `code`');
    expect(textInClass(html, 'md-tok-quote')).toBe('> ');
    expect(html).toContain('md-tok-code');
  });

  test('分割线着色为 hr（--- 作为非首行才视为分割线，首行 --- 属于 frontmatter）', () => {
    expect(textInClass(tokenizeMarkdown('# 标题\n---'), 'md-tok-hr')).toBe('---');
    expect(textInClass(tokenizeMarkdown('***'), 'md-tok-hr')).toBe('***');
    expect(textInClass(tokenizeMarkdown('___'), 'md-tok-hr')).toBe('___');
  });

  test('无序列表标记着色为 list，内容行内解析', () => {
    const html = tokenizeMarkdown('- 项目 **粗**');
    expect(textInClass(html, 'md-tok-list')).toBe('- ');
    expect(html).toContain('md-tok-bold');
  });

  test('有序列表标记着色为 list', () => {
    expect(textInClass(tokenizeMarkdown('1. 第一'), 'md-tok-list')).toBe('1. ');
  });

  test('任务列表复选框随标记一起着色', () => {
    const html = tokenizeMarkdown('- [x] 完成');
    expect(textInClass(html, 'md-tok-list')).toBe('- [x] ');
  });
});

describe('tokenizeMarkdown 围栏代码块', () => {
  test('围栏代码块整行着色为 codeblock，内部不做行内解析', () => {
    const html = tokenizeMarkdown('```js\nconst a = 1;\n```');
    const container = document.createElement('div');
    container.innerHTML = html;
    const blocks = container.querySelectorAll('.md-tok-codeblock');
    expect(blocks.length).toBe(3); // 三行各一个
    // 代码内容里不应出现行内 span
    const middle = blocks[1].textContent;
    expect(middle).toBe('const a = 1;');
    expect(blocks[1].innerHTML).not.toContain('md-tok-');
  });

  test('代码块结束后恢复行内解析', () => {
    const html = tokenizeMarkdown('```\ncode\n```\n**粗**');
    expect(html).toContain('md-tok-codeblock');
    expect(html).toContain('md-tok-bold');
  });
});

describe('tokenizeMarkdown frontmatter', () => {
  test('首行 --- 触发 frontmatter，整体着色直到闭合 ---', () => {
    const html = tokenizeMarkdown('---\ntitle: T\ntags: [a]\n---\n# 正文');
    const fmText = textInClass(html, 'md-tok-frontmatter');
    expect(fmText).toContain('---');
    expect(fmText).toContain('title: T');
    // 闭合后正文恢复标题着色
    expect(html).toContain('md-tok-heading');
  });

  test('非首行 --- 不触发 frontmatter', () => {
    const html = tokenizeMarkdown('# 标题\n---\n内容');
    expect(html).not.toContain('md-tok-frontmatter');
  });
});

describe('tokenizeMarkdown 行内元素', () => {
  test('行内代码着色为 code', () => {
    const html = tokenizeMarkdown('文字 `code` 结束');
    expect(textInClass(html, 'md-tok-code')).toBe('`code`');
  });

  test('加粗 ** ** 着色为 bold', () => {
    expect(textInClass(tokenizeMarkdown('a **粗** b'), 'md-tok-bold')).toBe('**粗**');
  });

  test('加粗 __ __ 着色为 bold', () => {
    expect(textInClass(tokenizeMarkdown('a __粗__ b'), 'md-tok-bold')).toBe('__粗__');
  });

  test('斜体 * * 着色为 italic', () => {
    expect(textInClass(tokenizeMarkdown('a *斜* b'), 'md-tok-italic')).toBe('*斜*');
  });

  test('链接 [t](u) 着色为 link', () => {
    expect(textInClass(tokenizeMarkdown('[文本](http://x)'), 'md-tok-link')).toBe('[文本](http://x)');
  });

  test('图片 ![a](u) 着色为 image 而非 link', () => {
    const html = tokenizeMarkdown('![图](http://x.png)');
    expect(textInClass(html, 'md-tok-image')).toBe('![图](http://x.png)');
    expect(html).not.toContain('md-tok-link');
  });

  test('加粗优先于斜体（不嵌套，整段 bold）', () => {
    const html = tokenizeMarkdown('**a*b*c**');
    expect(html).toContain('md-tok-bold');
    expect(html).not.toContain('md-tok-italic');
  });
});

describe('tokenizeMarkdown 字符保真与转义', () => {
  test('HTML 特殊字符被转义', () => {
    const html = tokenizeMarkdown('a <b> & c');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
    expect(html).not.toContain('<b>');
  });

  test('每个原始字符在输出中恰好出现一次（不含 span 标签字符）', () => {
    const src = '# 标题\n\n- 列表 `code` **粗** [链](u)\n\n```\nx=1\n```\n';
    const html = tokenizeMarkdown(src);
    // 去掉所有 span 标签，只留文本内容
    const stripped = html.replace(/<\/?span[^>]*>/g, '');
    // 按 \n 还原后应与原文本一致（验证无增删字符、span 不跨行）
    expect(stripped).toBe(src);
  });

  test('空文本与纯文本原样返回', () => {
    expect(tokenizeMarkdown('')).toBe('');
    const html = tokenizeMarkdown('普通文字');
    expect(html).toBe('普通文字');
  });
});

describe('getMdSyntaxCssVars', () => {
  test('github 主题返回全部 --md-tok-* 变量', () => {
    const vars = getMdSyntaxCssVars('github');
    expect(vars['--md-tok-heading']).toBe(mdSyntaxThemes.github.heading);
    expect(vars['--md-tok-codeblock']).toBe(mdSyntaxThemes.github.codeblock);
    expect(Object.keys(vars).length).toBe(Object.keys(mdSyntaxThemes.github).length);
  });

  test('none 主题返回空对象（不注入变量，颜色回退 inherit）', () => {
    expect(getMdSyntaxCssVars('none')).toEqual({});
  });

  test('三套主题颜色互不相同', () => {
    const g = getMdSyntaxCssVars('github');
    const d = getMdSyntaxCssVars('dracula');
    const mo = getMdSyntaxCssVars('monokai');
    expect(g['--md-tok-heading']).not.toBe(d['--md-tok-heading']);
    expect(g['--md-tok-heading']).not.toBe(mo['--md-tok-heading']);
  });
});

describe('tokenizeMarkdown SVG 源码高亮', () => {
  test('单行 <svg> 元素：标签/属性名/属性值分别着色', () => {
    const html = tokenizeMarkdown('<svg width="10" height="10"><rect fill="#fff"/></svg>');
    expect(textInClass(html, 'md-tok-svg-tag')).toBe('<svg><rect/></svg>');
    expect(textInClass(html, 'md-tok-svg-attr')).toBe('widthheightfill');
    expect(textInClass(html, 'md-tok-svg-str')).toBe('"10""10""#fff"');
  });

  test('SVG 内注释着色为 codeblock 灰色', () => {
    const html = tokenizeMarkdown('<svg><!-- 背景渐变 --><rect/></svg>');
    expect(textInClass(html, 'md-tok-codeblock')).toBe('<!-- 背景渐变 -->');
  });

  test('多行 SVG 元素块：块内持续着色，块外恢复行内解析', () => {
    const html = tokenizeMarkdown('<svg viewBox="0 0 10 10">\n  <rect width="10"/>\n</svg>\n普通 **粗** 文字');
    expect(textInClass(html, 'md-tok-svg-tag')).toBe('<svg><rect/></svg>');
    expect(textInClass(html, 'md-tok-svg-str')).toBe('"0 0 10 10""10"');
    // 块外恢复
    expect(html).toContain('md-tok-bold');
  });

  test('带命名空间属性（xmlns:xlink）与自闭合标签', () => {
    const html = tokenizeMarkdown('<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>');
    expect(textInClass(html, 'md-tok-svg-attr')).toBe('xmlns:xlink');
    expect(textInClass(html, 'md-tok-svg-str')).toBe('"http://www.w3.org/1999/xlink"');
    // 自闭合单行：不进入持续 svg 模式
    const after = tokenizeMarkdown('<svg/>\n普通行 **粗**');
    expect(after).toContain('md-tok-bold');
  });

  test('嵌套 <svg> 计数：外层闭合后才退出 svg 模式', () => {
    const html = tokenizeMarkdown('<svg><svg><rect/></svg>\n<rect/></svg>\n**粗**');
    expect(html).toContain('md-tok-svg-tag');
    expect(html).toContain('md-tok-bold');
  });

  test('行中提及 `<svg>` 不触发 svg 模式，行内代码优先', () => {
    const html = tokenizeMarkdown('使用 `<svg>` 标签 **加粗**');
    expect(html).not.toContain('md-tok-svg-tag');
    expect(html).toContain('md-tok-code');
    expect(html).toContain('md-tok-bold');
  });

  test('非 SVG 的 HTML 行保持原有行内解析', () => {
    const html = tokenizeMarkdown('<div>**粗**</div>');
    expect(html).not.toContain('md-tok-svg-tag');
    expect(html).toContain('md-tok-bold');
  });

  test('SVG 行字符保真（span 不跨行、无增删字符，尖括号按 HTML 转义）', () => {
    const src = '<svg viewBox="0 0 10 10">\n  <text>a & b</text>\n</svg>\n';
    const html = tokenizeMarkdown(src);
    const expected = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    expect(html.replace(/<\/?span[^>]*>/g, '')).toBe(expected);
  });

  test('三套主题均包含 SVG token 配色', () => {
    const vars = getMdSyntaxCssVars('dracula');
    expect(vars['--md-tok-svgTag']).toBe(mdSyntaxThemes.dracula.svgTag);
    expect(vars['--md-tok-svgAttr']).toBe(mdSyntaxThemes.dracula.svgAttr);
    expect(vars['--md-tok-svgString']).toBe(mdSyntaxThemes.dracula.svgString);
  });
});

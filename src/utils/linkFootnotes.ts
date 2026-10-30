// 在 Markdown 渲染后转换，兼容行内、引用式和 HTML 链接，避免误改代码与图片。
export function convertLinksToFootnotes(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;
  const references = new Map<string, number>();
  let section = container.querySelector('section.footnotes');
  let list = section?.querySelector<HTMLOListElement>('ol.footnotes-list');
  const existingNotes = Array.from(list?.children || []);
  const externalUrl = (link: Element): string | null => {
    const href = (link.getAttribute('href') || '').trim();
    return /^https?:\/\//i.test(href) ? href : null;
  };

  const noteNumbers = existingNotes.map((note, index) => Number(note.getAttribute('value')) || index + 1);

  // 保留已有注脚的编号，并让正文中同一网址复用已有来源。
  existingNotes.forEach((note, index) => {
    note.querySelectorAll('a[href]').forEach((link) => {
      const url = externalUrl(link);
      if (!url) return;
      if (!references.has(url)) references.set(url, noteNumbers[index]);
      const text = (link.textContent || '').trim();
      link.replaceWith(document.createTextNode(text && text !== url ? `${text}: ${url}` : url));
    });
  });
  container.querySelectorAll('.footnote-backref').forEach((link) => link.remove());
  container.querySelectorAll('.footnote-ref a').forEach((link) => {
    link.replaceWith(...Array.from(link.childNodes));
  });

  let nextNumber = Math.max(0, ...noteNumbers) + 1;
  const additions: Array<{ number: number; label: string; url: string }> = [];
  container.querySelectorAll('a[href]').forEach((link) => {
    if (link.closest('.footnotes, pre, code')) return;
    const url = externalUrl(link);
    if (!url) return;
    // 图片仍按原有图片流程上传，不把包裹图片的链接当作正文来源。
    if (link.querySelector('img')) {
      link.replaceWith(...Array.from(link.childNodes));
      return;
    }
    const label = (link.textContent || '').trim();
    // Markdown 图片标题转 figure 后，HTML 解析可能留下空的包裹链接。
    if (!label) {
      link.remove();
      return;
    }
    let number = references.get(url);
    if (number === undefined) {
      number = nextNumber++;
      references.set(url, number);
      additions.push({ number, label, url });
    }
    const ref = document.createElement('sup');
    ref.className = 'footnote-ref';
    ref.textContent = `[${number}]`;
    // 裸网址在正文只显示编号；带文字的链接保留原来的强调等行内格式。
    if (label === url) link.replaceWith(ref);
    else link.replaceWith(...Array.from(link.childNodes), ref);
  });

  if (additions.length) {
    if (!list) {
      const heading = document.createElement('h2');
      heading.textContent = '参考资料';
      section = document.createElement('section');
      section.className = 'footnotes';
      list = document.createElement('ol');
      list.className = 'footnotes-list';
      section.append(list);
      container.append(heading, section);
    }
    additions.forEach(({ number, label, url }) => {
      const item = document.createElement('li');
      item.className = 'footnote-item';
      item.value = number;
      const paragraph = document.createElement('p');
      paragraph.textContent = label && label !== url ? `${label}: ${url}` : url;
      item.append(paragraph);
      list!.append(item);
    });
  }
  return container.innerHTML;
}

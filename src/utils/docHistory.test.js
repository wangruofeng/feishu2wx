import {
  loadDocHistory,
  archiveCurrentDoc,
  removeDocHistory,
  clearDocHistory,
  extractDocTitle,
} from './docHistory';

const HISTORY_KEY = 'feishu2wx_docHistory';

beforeEach(() => {
  localStorage.clear();
});

test('archives document and loads it back with newest first', () => {
  archiveCurrentDoc('# 第一篇\n旧内容');
  archiveCurrentDoc('# 第二篇\n新内容');

  const history = loadDocHistory();
  expect(history).toHaveLength(2);
  expect(history[0].title).toBe('第二篇');
  expect(history[0].content).toBe('# 第二篇\n新内容');
  expect(history[1].title).toBe('第一篇');
  expect(typeof history[0].savedAt).toBe('number');
  expect(typeof history[0].id).toBe('string');
});

test('skips empty content with reason empty', () => {
  expect(archiveCurrentDoc('')).toEqual({ archived: false, reason: 'empty' });
  expect(archiveCurrentDoc('   \n  ')).toEqual({ archived: false, reason: 'empty' });
  expect(loadDocHistory()).toHaveLength(0);
});

test('skips archiving when content equals the newest entry', () => {
  archiveCurrentDoc('# 重复\n内容');
  expect(archiveCurrentDoc('# 重复\n内容')).toEqual({ archived: false, reason: 'duplicate' });
  expect(loadDocHistory()).toHaveLength(1);
});

test('skips content larger than 200KB utf-8 bytes', () => {
  // ASCII 每字符 1 字节，构造 200KB + 1
  const oversized = 'a'.repeat(200 * 1024 + 1);
  expect(archiveCurrentDoc(oversized)).toEqual({ archived: false, reason: 'too-large' });
  expect(loadDocHistory()).toHaveLength(0);

  // 中文每字符 3 字节，略超上限
  expect(archiveCurrentDoc('中'.repeat(Math.floor(200 * 1024 / 3) + 1)))
    .toEqual({ archived: false, reason: 'too-large' });

  // 200KB 以内正常存档
  expect(archiveCurrentDoc('a'.repeat(200 * 1024)).archived).toBe(true);
});

test('evicts oldest entries beyond the 20-entry cap', () => {
  for (let i = 1; i <= 21; i++) {
    archiveCurrentDoc(`# 第 ${i} 篇\n内容 ${i}`);
  }

  const history = loadDocHistory();
  expect(history).toHaveLength(20);
  expect(history[0].title).toBe('第 21 篇');
  expect(history[19].title).toBe('第 2 篇');
});

test('removes a single entry and returns the rest', () => {
  archiveCurrentDoc('# A\na');
  archiveCurrentDoc('# B\nb');

  const rest = removeDocHistory(loadDocHistory()[0].id);
  expect(rest).toHaveLength(1);
  expect(rest[0].title).toBe('A');
  expect(loadDocHistory()).toHaveLength(1);
});

test('clears all history', () => {
  archiveCurrentDoc('# A\na');
  clearDocHistory();
  expect(loadDocHistory()).toHaveLength(0);
  expect(localStorage.getItem(HISTORY_KEY)).toBe(null);
});

describe('extractDocTitle', () => {
  test('prefers frontmatter title', () => {
    expect(extractDocTitle('---\ntitle: 我的标题\n---\n# 正文标题\n')).toBe('我的标题');
  });

  test('falls back to first h1', () => {
    expect(extractDocTitle('# H1 标题\n\n## H2\n')).toBe('H1 标题');
  });

  test('falls back to placeholder when no title found', () => {
    expect(extractDocTitle('只有正文，没有标题')).toBe('未命名文章');
  });
});

describe('loadDocHistory heals dirty data', () => {
  test('returns empty array for invalid json', () => {
    localStorage.setItem(HISTORY_KEY, '{broken json');
    expect(loadDocHistory()).toHaveLength(0);
  });

  test('returns empty array for non-array value', () => {
    localStorage.setItem(HISTORY_KEY, '{"a":1}');
    expect(loadDocHistory()).toHaveLength(0);
  });

  test('filters entries with missing fields', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { id: '1', title: 'ok', content: 'x', savedAt: 1 },
      { id: '2', title: 'missing content', savedAt: 2 },
    ]));
    const history = loadDocHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('1');
  });
});

test('gives up with reason quota when storage always fails', () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota exceeded', 'QuotaExceededError');
  });

  try {
    expect(archiveCurrentDoc('# A\na')).toEqual({ archived: false, reason: 'quota' });
  } finally {
    spy.mockRestore();
  }
});

test('retries by evicting oldest entries when quota exceeded', () => {
  for (let i = 1; i <= 5; i++) {
    archiveCurrentDoc(`# 第 ${i} 篇\n内容 ${i}`);
  }

  // 前两次写入抛配额错误，之后回落原始实现：应淘汰两条最旧的
  const spy = jest.spyOn(Storage.prototype, 'setItem')
    .mockImplementationOnce(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    })
    .mockImplementationOnce(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

  try {
    expect(archiveCurrentDoc('# 第 6 篇\n内容 6').archived).toBe(true);
    const history = loadDocHistory();
    expect(history).toHaveLength(4);
    expect(history[0].title).toBe('第 6 篇');
    expect(history[3].title).toBe('第 3 篇');
  } finally {
    spy.mockRestore();
  }
});

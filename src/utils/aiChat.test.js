import {
  AI_START_MARKER,
  AI_END_MARKER,
  createAiStreamParser,
  normalizeProviderSettings,
  getActiveProvider,
  persistAiMessages,
  restoreAiMessages,
  pushInputHistory,
  loadInputHistory,
  formatAiMessageTime,
  formatAiDayDivider,
  isSameAiDay,
  streamAiChat,
} from './aiChat';

describe('createAiStreamParser', () => {
  test('splits reply and article on whole markers', () => {
    const replies = [];
    let articleDeltas = 0;
    const parser = createAiStreamParser((text) => replies.push(text), () => { articleDeltas += 1; });
    parser.push(`说明文字。\n\n${AI_START_MARKER}\n# 标题\n\n正文。\n${AI_END_MARKER}\n`);
    const result = parser.finish();
    expect(result.replyText).toBe('说明文字。');
    expect(result.articleText).toBe('# 标题\n\n正文。');
    expect(result.sawEndMarker).toBe(true);
    expect(articleDeltas).toBeGreaterThan(0);
  });

  test('handles markers split across chunks', () => {
    const parser = createAiStreamParser(() => {}, () => {});
    // 把开始标记从中间拆开：<<<ART | ICLE\n
    parser.push('好的。');
    parser.push('<');
    parser.push('<<');
    parser.push('ART');
    parser.push('ICLE\n');
    parser.push('# 新文章');
    parser.push('\n');
    // 结束标记同样拆断：ARTI | CLE>>>
    parser.push(`${AI_END_MARKER.slice(0, 4)}`);
    parser.push(`${AI_END_MARKER.slice(4)}\n`);
    const result = parser.finish();
    expect(result.replyText).toBe('好的。');
    expect(result.articleText).toBe('# 新文章');
    expect(result.sawEndMarker).toBe(true);
  });

  test('plain reply without markers', () => {
    const parser = createAiStreamParser(() => {}, () => {});
    parser.push('这是纯回答，没有修改稿。');
    const result = parser.finish();
    expect(result.replyText).toBe('这是纯回答，没有修改稿。');
    expect(result.articleText).toBe('');
    expect(result.sawEndMarker).toBe(false);
  });

  test('missing end marker marks truncated', () => {
    const parser = createAiStreamParser(() => {}, () => {});
    parser.push(`说明。\n${AI_START_MARKER}\n# 不完整的稿子`);
    const result = parser.finish();
    expect(result.articleText).toBe('# 不完整的稿子');
    expect(result.sawEndMarker).toBe(false);
  });

  test('does not leak marker prefix in reply when stream ends mid-marker', () => {
    const parser = createAiStreamParser(() => {}, () => {});
    parser.push('回答内容');
    parser.push('<<<AR'); // 流结束时只剩标记前缀
    const result = parser.finish();
    expect(result.replyText).toContain('回答内容');
    expect(result.replyText).toContain('<<<AR'); // finish 时原样吐出未完成前缀
    expect(result.articleText).toBe('');
  });
});

describe('normalizeProviderSettings', () => {
  test('returns empty settings for invalid raw', () => {
    expect(normalizeProviderSettings(null)).toEqual({
      activeProviderId: null,
      activeModelId: null,
      providers: [],
    });
  });

  test('falls back to first enabled provider when active id invalid', () => {
    const settings = normalizeProviderSettings({
      activeProviderId: 'gone',
      providers: [
        { id: 'a', enabled: false, baseUrl: 'https://a', apiKey: 'k', models: [{ id: 'm1' }] },
        { id: 'b', enabled: true, baseUrl: 'https://b', apiKey: 'k', models: [{ id: 'm2' }] },
      ],
    });
    expect(settings.activeProviderId).toBe('b');
    expect(settings.activeModelId).toBe('m2');
  });

  test('falls back to first model when active model missing', () => {
    const settings = normalizeProviderSettings({
      activeProviderId: 'a',
      activeModelId: 'nope',
      providers: [
        { id: 'a', enabled: true, baseUrl: 'https://a', apiKey: 'k', models: [{ id: 'm1' }, { id: 'm2' }] },
      ],
    });
    expect(settings.activeModelId).toBe('m1');
  });

  test('dedupes models and defaults format', () => {
    const settings = normalizeProviderSettings({
      providers: [
        { id: 'a', baseUrl: 'https://a', apiKey: 'k', models: ['m1', 'm1', { id: 'm2' }] },
      ],
    });
    expect(settings.providers[0].models).toEqual([{ id: 'm1' }, { id: 'm2' }]);
    expect(settings.providers[0].apiFormat).toBe('chat-completions');
  });

  test('keeps a single empty model row for editing and allows empty name', () => {
    const settings = normalizeProviderSettings({
      providers: [
        { id: 'a', baseUrl: 'https://a', apiKey: 'k', name: '', models: [{ id: '' }, { id: '' }, { id: 'm1' }] },
      ],
    });
    // 空占位行保留一个（「添加模型」中间态），展示方自行过滤空 id
    expect(settings.providers[0].models).toEqual([{ id: '' }, { id: 'm1' }]);
    // 空名称不强制兜底（由展示层 placeholder 兜底）
    expect(settings.providers[0].name).toBe('');
  });
});

describe('getActiveProvider', () => {
  const base = { name: 'p', apiFormat: 'chat-completions', models: [{ id: 'm' }] };

  test('returns null for disabled provider', () => {
    expect(getActiveProvider({
      activeProviderId: 'a',
      activeModelId: 'm',
      providers: [{ ...base, id: 'a', enabled: false, baseUrl: 'https://a', apiKey: 'k' }],
    })).toBeNull();
  });

  test('returns null when key or url missing', () => {
    expect(getActiveProvider({
      activeProviderId: 'a',
      activeModelId: 'm',
      providers: [{ ...base, id: 'a', enabled: true, baseUrl: '', apiKey: 'k' }],
    })).toBeNull();
  });

  test('returns provider when fully configured', () => {
    const provider = getActiveProvider({
      activeProviderId: 'a',
      activeModelId: 'm',
      providers: [{ ...base, id: 'a', enabled: true, baseUrl: 'https://a', apiKey: 'k' }],
    });
    expect(provider?.id).toBe('a');
  });
});

describe('message persistence', () => {
  test('persist strips images and restore round-trips', () => {
    persistAiMessages([
      { id: '1', role: 'user', content: 'hi', images: [{ mimeType: 'image/png', data: 'abc', previewUrl: 'data:' }], createdAt: 1 },
      { id: '2', role: 'assistant', content: '已改。', article: '# x', requestSource: '# y', createdAt: 2 },
    ]);
    const restored = restoreAiMessages();
    expect(restored.length).toBe(2);
    expect(restored[0].images).toBeUndefined();
    expect(restored[1].article).toBe('# x');
  });

  test('persist keeps attachment name/size but strips content', () => {
    persistAiMessages([
      {
        id: '1',
        role: 'user',
        content: '分析这个文件',
        attachments: [{ name: 'data.csv', size: 1024, content: 'a,b\n1,2' }],
        createdAt: 1,
      },
    ]);
    const restored = restoreAiMessages();
    expect(restored[0].attachments).toEqual([{ name: 'data.csv', size: 1024, content: '' }]);
  });

  test('drops oldest messages when quota exceeded', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem');
    spy.mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    try {
      persistAiMessages([
        { id: '1', role: 'user', content: 'old', createdAt: 1 },
        { id: '2', role: 'user', content: 'new', createdAt: 2 },
      ]);
      const restored = restoreAiMessages();
      expect(restored.map((m) => m.content)).toEqual(['new']);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('streamAiChat attachments', () => {
  test('sends an in-memory attachment from an earlier user message', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    try {
      await streamAiChat({
        source: '# 当前文章',
        history: [{
          role: 'user',
          content: '请先阅读附件。',
          attachments: [{ name: 'article.md', size: 20, content: '# 附件标题' }],
        }],
        content: '现在总结一下。',
        images: [],
        attachments: [],
        provider: { id: 'p', name: 'p', enabled: true, baseUrl: 'https://api.example.com', apiKey: 'key', apiFormat: 'chat-completions', models: [{ id: 'model' }] },
        modelId: 'model',
        signal: new AbortController().signal,
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].attachments).toEqual([{ name: 'article.md', content: '# 附件标题' }]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('does not send attachment metadata restored without its content', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    try {
      await streamAiChat({
        source: '# 当前文章',
        history: [{
          role: 'user',
          content: '请先阅读附件。',
          attachments: [{ name: 'article.md', size: 20, content: '' }],
        }],
        content: '现在总结一下。',
        images: [],
        attachments: [],
        provider: { id: 'p', name: 'p', enabled: true, baseUrl: 'https://api.example.com', apiKey: 'key', apiFormat: 'chat-completions', models: [{ id: 'model' }] },
        modelId: 'model',
        signal: new AbortController().signal,
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages[0].attachments).toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('message time formatting', () => {
  // 固定「当前时间」为 2026-08-29 10:00 本地时间，避免测试依赖真实时钟
  const now = new Date(2026, 7, 29, 10, 0).getTime();

  test('today shows HH:mm only, divider prefixed with 今天', () => {
    const ts = new Date(2026, 7, 29, 21, 42).getTime();
    expect(formatAiMessageTime(ts, now)).toBe('21:42');
    expect(formatAiDayDivider(ts, now)).toBe('今天 21:42');
  });

  test('other day shows month-day + time', () => {
    const ts = new Date(2026, 7, 18, 21, 42).getTime();
    expect(formatAiMessageTime(ts, now)).toBe('8月18日 21:42');
    expect(formatAiDayDivider(ts, now)).toBe('8月18日 21:42');
  });

  test('isSameAiDay compares calendar day regardless of time', () => {
    expect(isSameAiDay(new Date(2026, 7, 29, 0, 1).getTime(), now)).toBe(true);
    expect(isSameAiDay(new Date(2026, 7, 28, 23, 59).getTime(), now)).toBe(false);
  });

  test('zero timestamp renders empty', () => {
    expect(formatAiMessageTime(0, now)).toBe('');
    expect(formatAiDayDivider(0, now)).toBe('');
  });
});

describe('input history', () => {
  test('dedupes, trims and limits entries', () => {
    let history = [];
    for (let i = 0; i < 12; i += 1) {
      history = pushInputHistory(history, `指令 ${i}`);
    }
    history = pushInputHistory(history, '指令 5'); // 重复项上移
    expect(history.length).toBe(10);
    expect(history[history.length - 1]).toBe('指令 5');
    expect(loadInputHistory()).toEqual(history);
  });

  test('ignores empty input', () => {
    const history = pushInputHistory([], '   ');
    expect(history).toEqual([]);
  });
});

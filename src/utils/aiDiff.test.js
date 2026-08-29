import { diffArticleLines, changedArticleHunks } from './aiDiff';

describe('diffArticleLines', () => {
  test('detects insertions and deletions', () => {
    const ops = diffArticleLines('a\nb\nc', 'a\nx\nc\nd');
    const types = ops.map((op) => op.type).join(',');
    expect(types).toContain('del');
    expect(types).toContain('ins');
    expect(types).toContain('eq');
    // 未变的行应标记为 eq
    expect(ops.find((op) => op.text === 'a')?.type).toBe('eq');
    expect(ops.find((op) => op.text === 'c')?.type).toBe('eq');
    // 删除了 b，插入了 x 与 d
    expect(ops.find((op) => op.text === 'b')?.type).toBe('del');
    expect(ops.find((op) => op.text === 'x')?.type).toBe('ins');
    expect(ops.find((op) => op.text === 'd')?.type).toBe('ins');
  });

  test('empty strings compare as one equal empty line', () => {
    // ''.split('\n') === ['']，两个空串 diff 出一行 eq 空行（与源实现一致）
    expect(diffArticleLines('', '')).toEqual([{ type: 'eq', text: '' }]);
  });

  test('mostly ins when before is empty', () => {
    const ops = diffArticleLines('', 'x\ny');
    expect(ops).toEqual([
      { type: 'del', text: '' },
      { type: 'ins', text: 'x' },
      { type: 'ins', text: 'y' },
    ]);
    expect(changedArticleHunks('', 'x\ny').length).toBe(1);
  });

  test('mostly del when after is empty', () => {
    const ops = diffArticleLines('x\ny', '');
    expect(ops).toEqual([
      { type: 'del', text: 'x' },
      { type: 'del', text: 'y' },
      { type: 'ins', text: '' },
    ]);
  });

  test('degenerates gracefully beyond LCS table limit', () => {
    // 600 x 600 = 360000 > 250000 触发退化路径
    const before = Array.from({ length: 600 }, (_, i) => `line-${i}`);
    const after = Array.from({ length: 600 }, (_, i) => (i === 599 ? 'changed' : `line-${i}`));
    const ops = diffArticleLines(before.join('\n'), after.join('\n'));
    expect(ops).toEqual([
      { type: 'del', text: 'line-599' },
      { type: 'ins', text: 'changed' },
    ]);
  });
});

describe('changedArticleHunks', () => {
  test('groups consecutive changed lines into hunks', () => {
    const hunks = changedArticleHunks('a\nb\nc\nd\ne', 'a\nB\nc\nd\nE');
    expect(hunks.length).toBe(2);
    expect(hunks[0]).toEqual([{ type: 'del', text: 'b' }, { type: 'ins', text: 'B' }]);
    expect(hunks[1]).toEqual([{ type: 'del', text: 'e' }, { type: 'ins', text: 'E' }]);
  });

  test('returns empty hunks for identical text', () => {
    expect(changedArticleHunks('same', 'same')).toEqual([]);
  });
});

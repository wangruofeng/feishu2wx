import { findMatches, replaceAllMatches, replaceMatch } from './findReplace';

describe('findReplace', () => {
  test('finds literal text with optional case sensitivity', () => {
    expect(findMatches('Foo foo FOO', 'foo', { caseSensitive: false, regex: false }).matches).toHaveLength(3);
    const sensitive = findMatches('Foo foo FOO', 'foo', { caseSensitive: true, regex: false });
    expect(sensitive.matches.map((match) => [match.start, match.end])).toEqual([[4, 7]]);
  });

  test('supports regex matches across lines and capture replacement', () => {
    const result = findMatches('a1\na2', 'a(\\d)\\na(\\d)', { caseSensitive: true, regex: true });
    expect(result.matches[0].captures).toEqual(['1', '2']);
    expect(replaceAllMatches('a1 a2', 'a(\\d)', 'b$1', { caseSensitive: true, regex: true }).value).toBe('b1 b2');
  });

  test('treats replacement dollars literally outside regex mode', () => {
    expect(replaceAllMatches('$x $x', '$x', '$1', { caseSensitive: true, regex: false }).value).toBe('$1 $1');
  });

  test('reports invalid regex without changing content', () => {
    const result = replaceAllMatches('abc', '[', 'x', { caseSensitive: true, regex: true });
    expect(result.error).toBeTruthy();
    expect(result.value).toBe('abc');
    expect(result.matches).toEqual([]);
  });

  test('handles zero-length regex matches without looping forever', () => {
    const result = findMatches('😀a', '(?=.)', { caseSensitive: true, regex: true });
    expect(result.matches.map((match) => match.start)).toEqual([0, 2]);
  });

  test('replaces one selected match', () => {
    const match = findMatches('foo foo', 'foo', { caseSensitive: true, regex: false }).matches[1];
    expect(replaceMatch('foo foo', match, '$1', false)).toBe('foo $1');
  });
});

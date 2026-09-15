export interface FindOptions {
  caseSensitive: boolean;
  regex: boolean;
}

export interface FindMatch {
  start: number;
  end: number;
  text: string;
  captures: Array<string | undefined>;
  namedCaptures?: Record<string, string | undefined>;
}

export interface FindResult {
  matches: FindMatch[];
  error: string | null;
}

export interface ReplaceAllResult extends FindResult {
  value: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compilePattern = (query: string, options: FindOptions): RegExp | null => {
  if (!query) return null;
  return new RegExp(options.regex ? query : escapeRegExp(query), options.caseSensitive ? 'g' : 'gi');
};

const advanceCodePoint = (source: string, index: number): number => {
  const codePoint = source.codePointAt(index);
  return index + (codePoint !== undefined && codePoint > 0xffff ? 2 : 1);
};

export const findMatches = (source: string, query: string, options: FindOptions): FindResult => {
  let pattern: RegExp | null;
  try {
    pattern = compilePattern(query, options);
  } catch (error) {
    return { matches: [], error: error instanceof Error ? error.message : '正则表达式无效' };
  }

  if (!pattern) return { matches: [], error: null };

  const matches: FindMatch[] = [];
  let result: RegExpExecArray | null;
  while ((result = pattern.exec(source)) !== null) {
    matches.push({
      start: result.index,
      end: result.index + result[0].length,
      text: result[0],
      captures: result.slice(1),
      namedCaptures: result.groups,
    });
    if (result[0].length === 0) {
      pattern.lastIndex = advanceCodePoint(source, pattern.lastIndex);
    }
  }
  return { matches, error: null };
};

const expandRegexReplacement = (source: string, match: FindMatch, replacement: string): string => (
  replacement.replace(/\$(\$|&|`|'|<([^>]+)>|(\d{1,2}))/g, (token, kind: string, name: string, digits: string) => {
    if (kind === '$') return '$';
    if (kind === '&') return match.text;
    if (kind === '`') return source.slice(0, match.start);
    if (kind === "'") return source.slice(match.end);
    if (name !== undefined) {
      return match.namedCaptures && Object.prototype.hasOwnProperty.call(match.namedCaptures, name)
        ? match.namedCaptures[name] ?? ''
        : token;
    }
    const captureIndex = Number(digits);
    if (captureIndex > 0 && captureIndex <= match.captures.length) return match.captures[captureIndex - 1] ?? '';
    return token;
  })
);

export const replaceMatch = (
  source: string,
  match: FindMatch,
  replacement: string,
  regexMode: boolean
): string => {
  const inserted = regexMode ? expandRegexReplacement(source, match, replacement) : replacement;
  return source.slice(0, match.start) + inserted + source.slice(match.end);
};

export const replaceAllMatches = (
  source: string,
  query: string,
  replacement: string,
  options: FindOptions
): ReplaceAllResult => {
  const result = findMatches(source, query, options);
  if (result.error || result.matches.length === 0) return { ...result, value: source };

  let cursor = 0;
  let value = '';
  result.matches.forEach((match) => {
    value += source.slice(cursor, match.start);
    value += options.regex ? expandRegexReplacement(source, match, replacement) : replacement;
    cursor = match.end;
  });
  value += source.slice(cursor);
  return { ...result, value };
};

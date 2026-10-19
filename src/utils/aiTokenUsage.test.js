import { formatCompactTokenCount } from './aiTokenUsage';

test.each([
  [0, '0'], [999, '999'], [1000, '1K'], [1234, '1.2K'], [10000, '10K'],
  [999949, '999.9K'], [999950, '1M'], [1000000, '1M'], [1250000, '1.3M'],
  [1000000000, '1B'], [1000000000000, '1T'],
])('formats %s tokens as %s', (value, expected) => {
  expect(formatCompactTokenCount(value)).toBe(expected);
});

test.each([undefined, null, -1, NaN, Infinity])('does not turn invalid usage %s into a count', (value) => {
  expect(formatCompactTokenCount(value)).toBe('未返回');
});

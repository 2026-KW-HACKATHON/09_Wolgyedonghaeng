import { dark, light, base, type ColorTokens } from '../tokens';

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// design.md 2-3 표 (paper / surface / raised)
const TABLE: Record<'light' | 'dark', Record<string, [number, number, number]>> = {
  light: {
    ink: [14.7, 13.2, 16.2],
    inkSoft: [7.9, 7.1, 8.7],
    inkMuted: [5.6, 5.0, 6.1],
    green: [5.1, 4.6, 5.6],
    care: [5.7, 5.1, 6.3],
  },
  dark: {
    ink: [15.9, 14.1, 12.4],
    inkSoft: [10.8, 9.6, 8.5],
    inkMuted: [7.4, 6.6, 5.8],
    green: [9.7, 8.6, 7.6],
    care: [7.6, 6.7, 5.9],
  },
};

describe.each([
  ['light', light],
  ['dark', dark],
] as [string, ColorTokens][])('%s 토큰 대비', (name, c) => {
  const row = TABLE[name as 'light' | 'dark'];
  test.each(Object.keys(row))('%s 가 표와 일치하고 4.5 이상', (key) => {
    const fg = c[key as keyof ColorTokens];
    [c.paper, c.surface, c.raised].forEach((bg, i) => {
      const r = ratio(fg, bg);
      expect(r).toBeGreaterThanOrEqual(4.5);
      expect(Math.abs(r - row[key][i])).toBeLessThan(0.1);
    });
  });
  test('onGreen / green', () => {
    expect(ratio(c.onGreen, c.green)).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(ratio(c.onGreen, c.green) - (name === 'light' ? 5.6 : 9.5))).toBeLessThan(0.1);
  });
});

test('글자 크기는 17 이상, 본문 20', () => {
  Object.values(base.type).forEach((t) => expect(t.size).toBeGreaterThanOrEqual(17));
  expect(base.type.body.size).toBe(20);
  expect(base.size.buttonPrimary).toBe(60);
});

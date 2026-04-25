import type { VisTableRow } from '../../../common/types';

export type TotalFunc = 'sum' | 'avg' | 'min' | 'max' | 'count';

export function computeColumnTotal(
  columnId: string,
  rows: VisTableRow[],
  func: TotalFunc
): number | null {
  const numericValues = rows
    .map((row) => {
      const v = row[columnId];
      const n = typeof v === 'number' ? v : Number(v);
      return isNaN(n) ? null : n;
    })
    .filter((v): v is number => v !== null);

  if (func === 'count') return rows.length;
  if (numericValues.length === 0) return null;

  switch (func) {
    case 'sum':
      return numericValues.reduce((a, b) => a + b, 0);
    case 'avg':
      return numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    case 'min':
      return Math.min(...numericValues);
    case 'max':
      return Math.max(...numericValues);
    default:
      return null;
  }
}

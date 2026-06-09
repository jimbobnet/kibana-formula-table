import type { VisTableRow } from '../../../common/types';

export type TotalFunc = 'sum' | 'avg' | 'min' | 'max' | 'count';

export function computeColumnTotal(
  columnId: string,
  rows: VisTableRow[],
  func: TotalFunc
): number | null {
  if (func === 'count') return rows.length;

  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const row of rows) {
    const v = row[columnId];
    const n = typeof v === 'number' ? v : Number(v);
    if (isNaN(n)) continue;
    sum += n;
    count++;
    if (n < min) min = n;
    if (n > max) max = n;
  }

  if (count === 0) return null;

  switch (func) {
    case 'sum': return sum;
    case 'avg': return sum / count;
    case 'min': return min;
    case 'max': return max;
    default: return null;
  }
}

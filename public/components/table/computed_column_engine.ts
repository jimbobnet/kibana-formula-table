import { Parser } from 'expr-eval';
import { FORMULA_FUNCTIONS } from './formula_functions';
import type { ComputedColumn, VisTableColumn, VisTableRow } from '../../../common/types';

const buildParser = (): Parser => {
  const parser = new Parser({
    operators: {
      logical: true,
      comparison: true,
      'in': true,
      assignment: false,
    },
  });
  Object.entries(FORMULA_FUNCTIONS).forEach(([name, fn]) => {
    parser.functions[name] = fn;
  });
  return parser;
};

let sharedParser: Parser | null = null;
const getParser = (): Parser => {
  if (!sharedParser) sharedParser = buildParser();
  return sharedParser;
};

export function computeColumnsForTable(
  existingColumns: VisTableColumn[],
  rows: VisTableRow[],
  computedColumns: ComputedColumn[],
  totalHits: number
): { columns: VisTableColumn[]; rows: VisTableRow[] } {
  if (!computedColumns.length) return { columns: existingColumns, rows };

  const parser = getParser();
  const enabledCols = computedColumns.filter((cc) => cc.enabled);

  const totals = existingColumns.map((col) => {
    const vals = rows.map((r) => {
      const v = r[col.id];
      return typeof v === 'number' ? v : Number(v);
    });
    return vals.filter((v) => !isNaN(v)).reduce((a, b) => a + b, 0);
  });

  const newColumns: VisTableColumn[] = [...existingColumns];
  const newRows: VisTableRow[] = rows.map((row) => ({ ...row }));

  enabledCols.forEach((cc, ccIdx) => {
    const colId = `computed_col_${ccIdx}`;

    let expr: any;
    try {
      expr = parser.parse(cc.formula);
    } catch {
      return;
    }

    newColumns.push({
      id: colId,
      name: cc.label || `Computed ${ccIdx + 1}`,
      meta: { type: 'number' },
      filterable: false,
    });

    newRows.forEach((row, rowIdx) => {
      const vars: Record<string, unknown> = { totalHits };

      existingColumns.forEach((col, colIdx) => {
        const rawVal = row[col.id];
        const numVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
        const numOrNull = isNaN(numVal) ? null : numVal;

        vars[`col${colIdx}`] = numOrNull;
        vars[col.name] = numOrNull;
        vars[`total${colIdx}`] = totals[colIdx];
      });

      try {
        row[colId] = expr.evaluate(vars);
      } catch {
        row[colId] = null;
      }
    });
  });

  return { columns: newColumns, rows: newRows };
}

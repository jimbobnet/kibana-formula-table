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

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(v);
  return isNaN(n) ? null : n;
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

  // Mutable index updated before each row's evaluate() so cell()/formattedCell()
  // closures can reference the current row without rebuilding the parser per row.
  let currentRowIdx = 0;

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

    // Register cell/formattedCell with closures over newRows and currentRowIdx.
    // These are re-registered per computed column so they see the rows that exist
    // at the time this column is being evaluated.
    const rowsSnapshot = newRows;

    parser.functions.cell = (rowRef: 'first' | 'last' | number, colRef: number, defaultValue: unknown = null) => {
      const rowIdx =
        rowRef === 'first' ? 0
        : rowRef === 'last' ? rowsSnapshot.length - 1
        : currentRowIdx + (rowRef as number);
      const targetRow = rowsSnapshot[rowIdx];
      if (!targetRow) return defaultValue;
      const col = existingColumns[colRef];
      if (!col) return defaultValue;
      const n = toNum(targetRow[col.id]);
      return n !== null ? n : defaultValue;
    };

    parser.functions.formattedCell = (rowRef: 'first' | 'last' | number, colRef: number, defaultValue: unknown = null) => {
      const rowIdx =
        rowRef === 'first' ? 0
        : rowRef === 'last' ? rowsSnapshot.length - 1
        : currentRowIdx + (rowRef as number);
      const targetRow = rowsSnapshot[rowIdx];
      if (!targetRow) return defaultValue;
      const col = existingColumns[colRef];
      if (!col) return defaultValue;
      const v = targetRow[col.id];
      return v != null ? String(v) : defaultValue;
    };

    newRows.forEach((row, rowIdx) => {
      currentRowIdx = rowIdx;

      const vars: Record<string, unknown> = { totalHits };

      existingColumns.forEach((col, colIdx) => {
        const rawVal = row[col.id];
        const numOrNull = toNum(rawVal);

        vars[`col${colIdx}`] = numOrNull;
        vars[`formattedCol${colIdx}`] = rawVal != null ? String(rawVal) : '';
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

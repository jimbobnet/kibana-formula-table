import { formatComputedColumnValue } from './format_computed_value';
import { COMPUTED_COL_RE } from './computed_column_engine';
import type { ComputedColumn, VisTableColumn, VisTableRow } from '../../../common/types';

const escapeCell = (value: unknown, separator: string): string => {
  const s = value == null ? '' : String(value);
  if (s.includes(separator) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const formatCellValue = (
  rawVal: unknown,
  col: VisTableColumn,
  enabledComputedCols: ComputedColumn[]
): unknown => {
  const ccMatch = col.id.match(COMPUTED_COL_RE);
  if (ccMatch) {
    const cc = enabledComputedCols[parseInt(ccMatch[1], 10)];
    return cc ? formatComputedColumnValue(rawVal, cc) : String(rawVal ?? '');
  }
  return rawVal;
};

export const buildCsvContent = (
  rows: VisTableRow[],
  columns: VisTableColumn[],
  enabledComputedCols: ComputedColumn[],
  totalsRow: Record<string, string> | null,
  includeTotals: boolean,
  separator = ','
): string => {
  const header = columns.map((c) => escapeCell(c.name, separator)).join(separator);
  const dataRows = rows.map((row) =>
    columns
      .map((c) => escapeCell(formatCellValue(row[c.id], c, enabledComputedCols), separator))
      .join(separator)
  );
  const lines = [header, ...dataRows];
  if (includeTotals && totalsRow) {
    lines.push(
      columns.map((c) => escapeCell(totalsRow[c.id] ?? '', separator)).join(separator)
    );
  }
  return lines.join('\n');
};

export const downloadCsv = (content: string, filename: string): void => {
  // BOM (﻿) ensures Excel opens UTF-8 correctly
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

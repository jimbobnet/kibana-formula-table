import Handlebars, { compileFnName } from '@kbn/handlebars';
import type { TemplateDelegate } from '@kbn/handlebars';
import DOMPurify from 'dompurify';

let hbs: typeof Handlebars | null = null;

const getHbs = () => {
  if (!hbs) {
    hbs = Handlebars.create();
    hbs.registerHelper('encodeURIComponent', encodeURIComponent);
  }
  return hbs;
};

export const compileTemplate = (templateStr: string): TemplateDelegate =>
  getHbs()[compileFnName](templateStr);

export const renderTemplate = (compiled: TemplateDelegate, context: Record<string, unknown>): string => {
  try {
    return DOMPurify.sanitize(compiled(context));
  } catch {
    return '';
  }
};

export const buildTemplateContext = (
  allColumns: Array<{ id: string }>,
  row: Record<string, unknown>,
  totalsRow: Record<string, string> | null,
  totalHits: number,
  formattedValue: string,
  rawValue: unknown
): Record<string, unknown> => {
  const ctx: Record<string, unknown> = { totalHits, total: totalHits, value: formattedValue, rawValue };
  allColumns.forEach((col, i) => {
    ctx[`col${i}`] = row[col.id];
    ctx[`formattedCol${i}`] = row[col.id] != null ? String(row[col.id]) : '';
    if (totalsRow) ctx[`total${i}`] = totalsRow[col.id];
  });
  return ctx;
};

import type { VisTable, VisRenderData, VisTableColumn, VisTableRow, AggConfigLike, FieldColumn } from '../../common/types';

interface AggResponseColumn {
  id: string;
  name: string;
  aggConfig?: AggConfigLike;
  meta?: VisTableColumn['meta'];
}

interface AggResponse {
  columns: AggResponseColumn[];
  rows: VisTableRow[];
  totalHits?: number;
}

interface HitRecord {
  _source?: Record<string, unknown>;
  fields?: Record<string, unknown[]>;
  [key: string]: unknown;
}

interface DocumentResponse {
  fieldColumns: FieldColumn[];
  hits: HitRecord[];
  totalHits?: number;
  indexPatternId?: string;
}

function splitTableByColumn(
  columns: AggResponseColumn[],
  rows: VisTableRow[],
  title?: string
): VisTable[] {
  const splitColumn = columns.find(
    (col) => col.meta?.sourceParams?.schema === 'split'
  );

  if (!splitColumn) {
    return [
      {
        title,
        columns: columns.map((col) => ({
          id: col.id,
          name: col.name,
          aggConfig: col.aggConfig,
          meta: col.meta,
          filterable: Boolean(col.aggConfig?.isFilterable?.()),
        })),
        rows: rows.map((row) => ({ ...row })),
      },
    ];
  }

  const splitColumnIndex = columns.findIndex((col) => col.id === splitColumn.id);
  const filteredColumns = columns.filter((_, i) => i !== splitColumnIndex);

  const groups: Record<string, VisTableRow[]> = {};
  const groupOrder: unknown[] = [];

  rows.forEach((row) => {
    const splitValue = row[splitColumn.id];
    const key = String(splitValue);
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(splitValue);
    }
    const newRow: VisTableRow = {};
    filteredColumns.forEach((col) => {
      newRow[col.id] = row[col.id];
    });
    groups[key].push(newRow);
  });

  const tables: VisTable[] = [];
  groupOrder.forEach((splitValue) => {
    const key = String(splitValue);
    const groupTitle = `${splitColumn.name}: ${splitValue}`;
    const subTables = splitTableByColumn(filteredColumns, groups[key], groupTitle);
    tables.push(...subTables);
  });

  return tables;
}

export function enhancedTableResponseHandler(response: AggResponse): VisRenderData {
  const tables = splitTableByColumn(response.columns, response.rows);
  return { tables, totalHits: response.totalHits ?? 0 };
}

export function documentTableResponseHandler(response: DocumentResponse): VisRenderData {
  const { fieldColumns, hits, totalHits } = response;

  if (!fieldColumns || !hits) {
    return { tables: [], totalHits: totalHits ?? 0 };
  }

  const enabledCols = fieldColumns.filter((fc) => fc.enabled !== false);

  const columns = enabledCols.map((fc, i) => {
    const isSource = fc.field?.name === '_source';
    return {
      id: `col-${i}`,
      name: fc.label || fc.field.name,
      meta: {
        type: 'string',
        field: fc.field.name,
        index: response.indexPatternId,
        source: 'esaggs',
        sourceParams: {
          indexPatternId: response.indexPatternId,
          schema: 'bucket',
          type: 'terms',
          params: { field: fc.field.name },
          enabled: true,
        },
      },
      filterable: !isSource,
    };
  });

  const rows = hits.map((hit) => {
    const row: VisTableRow = {};
    enabledCols.forEach((fc, i) => {
      const fieldName = fc.field.name;
      if (fieldName === '_source') {
        row[`col-${i}`] = JSON.stringify(hit._source);
      } else if (fieldName.startsWith('_')) {
        row[`col-${i}`] = hit[fieldName] ?? null;
      } else {
        let value: unknown =
          hit._source?.[fieldName] ??
          hit.fields?.[fieldName] ??
          null;
        if (Array.isArray(value) && value.length === 1) {
          value = value[0];
        }
        row[`col-${i}`] = value;
      }
    });
    return row;
  });

  return {
    tables: [{ columns, rows }],
    totalHits: totalHits ?? 0,
  };
}

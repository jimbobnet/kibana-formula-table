export interface ComputedColumn {
  label: string;
  formula: string;
  format: 'string' | 'number' | 'date';
  pattern?: string;
  alignment: 'left' | 'center' | 'right';
  applyAlignmentOnTitle: boolean;
  applyAlignmentOnTotal: boolean;
  computeTotalUsingFormula: boolean;
  enabled: boolean;
  customColumnPosition?: number;
}

export interface FieldColumn {
  label: string;
  field: {
    name: string;
    type?: string;
    aggregatable?: boolean;
    scripted?: boolean;
    script?: string;
  };
  enabled: boolean;
}

export interface EnhancedTableParams {
  perPage: number;
  sort: { columnIndex: number | null; direction: 'asc' | 'desc' | null };
  showTotal: boolean;
  totalFunc: 'sum' | 'avg' | 'min' | 'max' | 'count';
  computedColumns: ComputedColumn[];
  showPartialRows: boolean;
  showMetricsAtAllLevels: boolean;
  computedColsPerSplitCol: boolean;
  stripedRows: boolean;
  addRowNumberColumn: boolean;
  hideExportLinks: boolean;
}

export interface DocumentTableParams {
  perPage: number;
  sort: { columnIndex: number | null; direction: 'asc' | 'desc' | null };
  showTotal: boolean;
  totalFunc: 'sum' | 'avg' | 'min' | 'max' | 'count';
  computedColumns: ComputedColumn[];
  stripedRows: boolean;
  addRowNumberColumn: boolean;
  hideExportLinks: boolean;
  fieldColumns: FieldColumn[];
  hitsSize: number;
  sortField: { name: string };
  sortOrder: 'asc' | 'desc';
}

export interface VisTableColumn {
  id: string;
  name: string;
  aggConfig?: any;
  meta?: {
    type?: string;
    field?: string;
    index?: string;
    source?: string;
    params?: unknown;
    sourceParams?: any;
  };
  filterable?: boolean;
}

export type VisTableRow = Record<string, unknown>;

export interface VisTable {
  columns: VisTableColumn[];
  rows: VisTableRow[];
  title?: string;
}

export interface VisRenderData {
  tables: VisTable[];
  totalHits: number;
}

export interface ComputedColumn {
  label: string;
  formula: string;
  format: 'string' | 'number' | 'date' | 'duration';
  pattern?: string;
  datePattern?: string;
  durationInputFormat?: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  durationOutputFormat?: 'humanize' | 'humanizeVeryPrecise' | 'asMilliseconds' | 'asSeconds' | 'asMinutes' | 'asHours' | 'asDays' | 'asWeeks' | 'asMonths' | 'asYears';
  durationOutputPrecision?: number;
  durationUseShortSuffix?: boolean;
  durationIncludeSpaceWithSuffix?: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify';
  applyAlignmentOnTitle: boolean;
  applyAlignmentOnTotal: boolean;
  computeTotalUsingFormula: boolean;
  enabled: boolean;
  customColumnPosition?: number;
  applyTemplate?: boolean;
  applyTemplateOnTotal?: boolean;
  template?: string;
  cellComputedCss?: string;
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
  totalLabel?: string;
  computedColumns: ComputedColumn[];
  showPartialRows: boolean;
  showMetricsAtAllLevels: boolean;
  computedColsPerSplitCol: boolean;
  stripedRows: boolean;
  addRowNumberColumn: boolean;
  hideExportLinks: boolean;
  csvExportWithTotal: boolean;
  csvFullExport: boolean;
  hiddenColumns?: string;
  showFilterBar?: boolean;
  filterCaseSensitive?: boolean;
  filterBarHideable?: boolean;
  filterAsYouType?: boolean;
  filterTermsSeparately?: boolean;
  filterHighlightResults?: boolean;
  filterBarWidth?: string;
  rowComputedFilter?: string;
  rowComputedCss?: string;
  sortSplitCols?: boolean;
  hideToolbar?: boolean;
}

export interface DocumentTableParams {
  perPage: number;
  sort: { columnIndex: number | null; direction: 'asc' | 'desc' | null };
  showTotal: boolean;
  totalFunc: 'sum' | 'avg' | 'min' | 'max' | 'count';
  totalLabel?: string;
  computedColumns: ComputedColumn[];
  stripedRows: boolean;
  addRowNumberColumn: boolean;
  hideExportLinks: boolean;
  csvExportWithTotal: boolean;
  csvFullExport: boolean;
  hiddenColumns?: string;
  showFilterBar?: boolean;
  filterCaseSensitive?: boolean;
  filterBarHideable?: boolean;
  filterAsYouType?: boolean;
  filterTermsSeparately?: boolean;
  filterHighlightResults?: boolean;
  filterBarWidth?: string;
  rowComputedFilter?: string;
  rowComputedCss?: string;
  hideToolbar?: boolean;
  fieldColumns: FieldColumn[];
  hitsSize: number;
  sortField: { name: string };
  sortOrder: 'asc' | 'desc';
}

/** Minimal structural type covering aggConfig usage in this plugin. */
export interface AggConfigLike {
  isFilterable?: () => boolean;
  schema?: string;
}

export interface VisTableColumn {
  id: string;
  name: string;
  aggConfig?: AggConfigLike;
  meta?: {
    type?: string;
    field?: string;
    index?: string;
    source?: string;
    params?: unknown;
    sourceParams?: {
      schema?: string;
      indexPatternId?: string;
      type?: string;
      params?: unknown;
      enabled?: boolean;
      [key: string]: unknown;
    };
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

/** Discriminated union of events fired by the table component. */
export interface TableFilterEvent {
  name: 'filter';
  data: {
    negate: boolean;
    data: Array<{ row: number; column: number; value: unknown; table: unknown }>;
  };
}

export interface TableRowClickEvent {
  name: 'tableRowContextMenuClick';
  data: { rowIndex: number; table: unknown; columns: string[] };
}

export type TableEvent = TableFilterEvent | TableRowClickEvent;

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
  alignment: 'left' | 'center' | 'right';
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

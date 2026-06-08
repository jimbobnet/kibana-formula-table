import React from 'react';
import type { DropResult } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';

// ── types ─────────────────────────────────────────────────────────────────────

export type AggSchema = 'metric' | 'bucket' | 'split' | 'splitcols';

export interface AggRow {
  id: string;
  enabled: boolean;
  type: string;
  schema: AggSchema;
  params: Record<string, unknown>;
  customLabel?: string;
}

// ── serialize / parse ─────────────────────────────────────────────────────────

export function parseAggRowsFromConfig(
  aggConfigs: unknown[],
  _schemas: Record<string, number[]>
): AggRow[] {
  const cfgs = aggConfigs as Array<Record<string, any>>;
  if (cfgs.length === 0) return [makeMetricRow('1')];
  return cfgs.map((cfg, idx) => ({
    id: String(cfg.id ?? idx + 1),
    enabled: cfg.enabled !== false,
    type: cfg.type ?? 'count',
    schema: (cfg.schema ?? 'metric') as AggSchema,
    params: cfg.params ?? {},
    ...(cfg.customLabel ? { customLabel: String(cfg.customLabel) } : {}),
  }));
}

export function serializeAggRows(rows: AggRow[]): {
  aggConfigs: unknown[];
  schemas: Record<string, number[]>;
} {
  return {
    aggConfigs: rows.map((r) => ({
      id: r.id,
      enabled: r.enabled,
      type: r.type,
      schema: r.schema,
      params: r.params,
      ...(r.customLabel ? { customLabel: r.customLabel } : {}),
    })),
    schemas: {},
  };
}

// ── row factories ─────────────────────────────────────────────────────────────

// Use a monotonic integer counter for agg IDs — decimal IDs (e.g. from
// Date.now() + Math.random()) are truncated by the split('.')[0] lookup in
// enhanced_table_component.tsx, causing aggs.byId() to miss and filterable = false.
let _idCounter = 100;
const nextAggId = () => String(++_idCounter);

function makeMetricRow(id?: string): AggRow {
  return {
    id: id ?? nextAggId(),
    enabled: true,
    type: 'count',
    schema: 'metric',
    params: {},
  };
}

function makeBucketRow(schema: AggSchema): AggRow {
  return {
    id: nextAggId(),
    enabled: true,
    type: 'terms',
    schema,
    params: { size: 5, order: 'desc', orderBy: '_count' },
  };
}

// ── static option lists ───────────────────────────────────────────────────────

const METRIC_TYPES = [
  { value: 'count', text: i18n.translate('enhancedTable2.aggEditor.type.count', { defaultMessage: 'Count' }) },
  { value: 'sum', text: i18n.translate('enhancedTable2.aggEditor.type.sum', { defaultMessage: 'Sum' }) },
  { value: 'avg', text: i18n.translate('enhancedTable2.aggEditor.type.avg', { defaultMessage: 'Average' }) },
  { value: 'min', text: i18n.translate('enhancedTable2.aggEditor.type.min', { defaultMessage: 'Min' }) },
  { value: 'max', text: i18n.translate('enhancedTable2.aggEditor.type.max', { defaultMessage: 'Max' }) },
  { value: 'cardinality', text: i18n.translate('enhancedTable2.aggEditor.type.cardinality', { defaultMessage: 'Unique count' }) },
  { value: 'top_hits', text: i18n.translate('enhancedTable2.aggEditor.type.topHits', { defaultMessage: 'Top hit' }) },
];

const BUCKET_TYPES = [
  { value: 'terms', text: i18n.translate('enhancedTable2.aggEditor.type.terms', { defaultMessage: 'Terms' }) },
  { value: 'date_histogram', text: i18n.translate('enhancedTable2.aggEditor.type.dateHistogram', { defaultMessage: 'Date histogram' }) },
  { value: 'histogram', text: i18n.translate('enhancedTable2.aggEditor.type.histogram', { defaultMessage: 'Histogram' }) },
  { value: 'significant_terms', text: i18n.translate('enhancedTable2.aggEditor.type.significantTerms', { defaultMessage: 'Significant terms' }) },
  { value: 'ip_prefix', text: i18n.translate('enhancedTable2.aggEditor.type.ipPrefix', { defaultMessage: 'IP prefix' }) },
];

const DATE_INTERVAL_OPTIONS = [
  { value: 'auto', text: i18n.translate('enhancedTable2.aggEditor.interval.auto', { defaultMessage: 'Auto' }) },
  { value: '1m', text: i18n.translate('enhancedTable2.aggEditor.interval.1m', { defaultMessage: '1 minute' }) },
  { value: '5m', text: i18n.translate('enhancedTable2.aggEditor.interval.5m', { defaultMessage: '5 minutes' }) },
  { value: '10m', text: i18n.translate('enhancedTable2.aggEditor.interval.10m', { defaultMessage: '10 minutes' }) },
  { value: '30m', text: i18n.translate('enhancedTable2.aggEditor.interval.30m', { defaultMessage: '30 minutes' }) },
  { value: '1h', text: i18n.translate('enhancedTable2.aggEditor.interval.1h', { defaultMessage: '1 hour' }) },
  { value: '3h', text: i18n.translate('enhancedTable2.aggEditor.interval.3h', { defaultMessage: '3 hours' }) },
  { value: '12h', text: i18n.translate('enhancedTable2.aggEditor.interval.12h', { defaultMessage: '12 hours' }) },
  { value: '1d', text: i18n.translate('enhancedTable2.aggEditor.interval.1d', { defaultMessage: '1 day' }) },
  { value: '1w', text: i18n.translate('enhancedTable2.aggEditor.interval.1w', { defaultMessage: '1 week' }) },
  { value: '1M', text: i18n.translate('enhancedTable2.aggEditor.interval.1M', { defaultMessage: '1 month' }) },
  { value: '1y', text: i18n.translate('enhancedTable2.aggEditor.interval.1y', { defaultMessage: '1 year' }) },
];

const ORDER_OPTIONS = [
  { value: 'desc', text: i18n.translate('enhancedTable2.aggEditor.order.desc', { defaultMessage: 'Descending' }) },
  { value: 'asc', text: i18n.translate('enhancedTable2.aggEditor.order.asc', { defaultMessage: 'Ascending' }) },
];

// ── field helpers ─────────────────────────────────────────────────────────────

export function needsField(type: string): boolean {
  return type !== 'count';
}

function getFieldOptions(
  type: string,
  dataView: DataView | undefined
): Array<{ value: string; text: string }> {
  const fields = (dataView?.fields ?? []).filter((f: any) => f.aggregatable);
  let filtered: any[] = fields;
  if (['sum', 'avg', 'histogram'].includes(type)) {
    filtered = fields.filter((f: any) => f.type === 'number');
  } else if (['min', 'max'].includes(type)) {
    filtered = fields.filter((f: any) => f.type === 'number' || f.type === 'date');
  } else if (['date_histogram', 'date_range'].includes(type)) {
    filtered = fields.filter((f: any) => f.type === 'date');
  }
  return [
    { value: '', text: i18n.translate('enhancedTable2.aggEditor.selectField', { defaultMessage: '— Select field —' }) },
    ...filtered.map((f: any) => ({ value: f.name, text: f.name })),
  ];
}

function getDefaultParamsForType(type: string): Record<string, unknown> {
  if (type === 'terms') return { size: 5, order: 'desc', orderBy: '_count' };
  if (type === 'date_histogram') return { calendar_interval: 'auto' };
  if (type === 'histogram') return { interval: 100 };
  return {};
}

// ── AggRowEditor ──────────────────────────────────────────────────────────────

interface AggRowEditorProps {
  row: AggRow;
  typeOptions: Array<{ value: string; text: string }>;
  metricRows: AggRow[];
  canRemove: boolean;
  dataView: DataView | undefined;
  onChange: (patch: Partial<AggRow>) => void;
  onRemove: () => void;
  provided: any;
}

const AggRowEditor: React.FC<AggRowEditorProps> = ({
  row,
  typeOptions,
  metricRows,
  canRemove,
  dataView,
  onChange,
  onRemove,
  provided,
}) => {
  const fieldOptions = getFieldOptions(row.type, dataView);

  const updateParam = (key: string, val: unknown) =>
    onChange({ params: { ...row.params, [key]: val } });

  const handleTypeChange = (newType: string) => {
    onChange({ type: newType, params: getDefaultParamsForType(newType) });
  };

  const orderByOptions = [
    { value: '_count', text: i18n.translate('enhancedTable2.aggEditor.orderByCount', { defaultMessage: 'Document count' }) },
    { value: '_key', text: i18n.translate('enhancedTable2.aggEditor.orderByKey', { defaultMessage: 'Alphabetical' }) },
    ...metricRows.map((m) => ({
      value: m.id,
      text: `${m.type}${(m.params.field as string) ? `(${m.params.field})` : ''}`,
    })),
  ];

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <div
            {...provided.dragHandleProps}
            aria-label={i18n.translate('enhancedTable2.aggEditor.drag', { defaultMessage: 'Drag to reorder' })}
            style={{ paddingTop: 22 }}
          >
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>

        {/* Agg type */}
        <EuiFlexItem style={{ minWidth: 150 }}>
          <EuiFormRow
            label={i18n.translate('enhancedTable2.aggEditor.aggregation', { defaultMessage: 'Aggregation' })}
            display="rowCompressed"
          >
            <EuiSelect
              compressed
              options={typeOptions}
              value={row.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>

        {/* Field selector */}
        {needsField(row.type) && (
          <EuiFlexItem style={{ minWidth: 160 }}>
            <EuiFormRow
              label={i18n.translate('enhancedTable2.aggEditor.field', { defaultMessage: 'Field' })}
              display="rowCompressed"
            >
              {fieldOptions.length > 1 ? (
                <EuiSelect
                  compressed
                  options={fieldOptions}
                  value={(row.params.field as string) ?? ''}
                  onChange={(e) => updateParam('field', e.target.value)}
                />
              ) : (
                <EuiFieldText
                  compressed
                  placeholder={i18n.translate('enhancedTable2.aggEditor.fieldPlaceholder', { defaultMessage: 'field name' })}
                  value={(row.params.field as string) ?? ''}
                  onChange={(e) => updateParam('field', e.target.value)}
                />
              )}
            </EuiFormRow>
          </EuiFlexItem>
        )}

        {/* Terms params */}
        {row.type === 'terms' || row.type === 'significant_terms' ? (
          <>
            <EuiFlexItem style={{ minWidth: 70 }}>
              <EuiFormRow
                label={i18n.translate('enhancedTable2.aggEditor.size', { defaultMessage: 'Size' })}
                display="rowCompressed"
              >
                <EuiFieldNumber
                  compressed
                  min={1}
                  value={(row.params.size as number) ?? 5}
                  onChange={(e) => updateParam('size', parseInt(e.target.value, 10) || 5)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 140 }}>
              <EuiFormRow
                label={i18n.translate('enhancedTable2.aggEditor.orderBy', { defaultMessage: 'Order by' })}
                display="rowCompressed"
              >
                <EuiSelect
                  compressed
                  options={orderByOptions}
                  value={(row.params.orderBy as string) ?? '_count'}
                  onChange={(e) => updateParam('orderBy', e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 120 }}>
              <EuiFormRow
                label={i18n.translate('enhancedTable2.aggEditor.order', { defaultMessage: 'Order' })}
                display="rowCompressed"
              >
                <EuiSelect
                  compressed
                  options={ORDER_OPTIONS}
                  value={(row.params.order as string) ?? 'desc'}
                  onChange={(e) => updateParam('order', e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </>
        ) : null}

        {/* Date histogram interval */}
        {row.type === 'date_histogram' && (
          <EuiFlexItem style={{ minWidth: 130 }}>
            <EuiFormRow
              label={i18n.translate('enhancedTable2.aggEditor.calendarInterval', { defaultMessage: 'Interval' })}
              display="rowCompressed"
            >
              <EuiSelect
                compressed
                options={DATE_INTERVAL_OPTIONS}
                value={(row.params.calendar_interval as string) ?? 'auto'}
                onChange={(e) => updateParam('calendar_interval', e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}

        {/* Histogram interval */}
        {row.type === 'histogram' && (
          <EuiFlexItem style={{ minWidth: 100 }}>
            <EuiFormRow
              label={i18n.translate('enhancedTable2.aggEditor.interval', { defaultMessage: 'Interval' })}
              display="rowCompressed"
            >
              <EuiFieldNumber
                compressed
                min={1}
                value={(row.params.interval as number) ?? 100}
                onChange={(e) => updateParam('interval', parseFloat(e.target.value) || 100)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}

        {/* Remove button */}
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            aria-label={i18n.translate('enhancedTable2.aggEditor.remove', { defaultMessage: 'Remove' })}
            isDisabled={!canRemove}
            onClick={onRemove}
            style={{ marginTop: 18 }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiAccordion
        id={`agg-advanced-${row.id}`}
        buttonContent={i18n.translate('enhancedTable2.aggEditor.advanced', { defaultMessage: 'Advanced' })}
        initialIsOpen={Boolean(row.customLabel)}
        paddingSize="s"
      >
        <EuiFormRow
          label={i18n.translate('enhancedTable2.aggEditor.customLabel', { defaultMessage: 'Column title' })}
          helpText={i18n.translate('enhancedTable2.aggEditor.customLabelHelp', { defaultMessage: 'Overrides the auto-generated column header.' })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            placeholder={i18n.translate('enhancedTable2.aggEditor.customLabelPlaceholder', { defaultMessage: 'e.g. My column' })}
            value={row.customLabel ?? ''}
            onChange={(e) => onChange({ customLabel: e.target.value || undefined })}
          />
        </EuiFormRow>
      </EuiAccordion>
    </EuiPanel>
  );
};

// ── AggSection ────────────────────────────────────────────────────────────────

interface AggSectionProps {
  title: string;
  droppableId: string;
  rows: AggRow[];
  typeOptions: Array<{ value: string; text: string }>;
  metricRows: AggRow[];
  minRows: number;
  maxRows?: number;
  emptyLabel: string;
  addLabel: string;
  hint?: string;
  dataView: DataView | undefined;
  onAdd: () => void;
  onDragEnd: (result: DropResult) => void;
  onChangeRow: (id: string, patch: Partial<AggRow>) => void;
  onRemoveRow: (id: string) => void;
}

const AggSection: React.FC<AggSectionProps> = ({
  title,
  droppableId,
  rows,
  typeOptions,
  metricRows,
  minRows,
  maxRows,
  emptyLabel,
  addLabel,
  hint,
  dataView,
  onAdd,
  onDragEnd,
  onChangeRow,
  onRemoveRow,
}) => (
  <EuiPanel paddingSize="s">
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {(maxRows === undefined || rows.length < maxRows) && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" iconType="plusInCircle" onClick={onAdd}>
            {addLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    {hint && rows.length > 0 && (
      <>
        <EuiText size="xs" color="subdued"><p>{hint}</p></EuiText>
        <EuiSpacer size="xs" />
      </>
    )}
    {rows.length === 0 && (
      <EuiText size="s" color="subdued">
        <p>{emptyLabel}</p>
      </EuiText>
    )}
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable droppableId={droppableId} spacing="s">
        <>
          {rows.map((row, idx) => (
            <EuiDraggable
              key={row.id}
              index={idx}
              draggableId={`${droppableId}-${row.id}`}
              customDragHandle
              spacing="s"
            >
              {(provided) => (
                <AggRowEditor
                  row={row}
                  typeOptions={typeOptions}
                  metricRows={metricRows}
                  canRemove={rows.length > minRows}
                  dataView={dataView}
                  onChange={(patch) => onChangeRow(row.id, patch)}
                  onRemove={() => onRemoveRow(row.id)}
                  provided={provided}
                />
              )}
            </EuiDraggable>
          ))}
        </>
      </EuiDroppable>
    </EuiDragDropContext>
  </EuiPanel>
);

// ── AggConfigsEditor ──────────────────────────────────────────────────────────

interface AggConfigsEditorProps {
  value: AggRow[];
  onChange: (rows: AggRow[]) => void;
  dataView: DataView | undefined;
}

export const AggConfigsEditor: React.FC<AggConfigsEditorProps> = ({
  value,
  onChange,
  dataView,
}) => {
  const metricRows = value.filter((r) => r.schema === 'metric');
  const splitRows = value.filter((r) => r.schema === 'split');
  const bucketRows = value.filter((r) => r.schema === 'bucket');
  const splitcolsRows = value.filter((r) => r.schema === 'splitcols');

  // Canonical order: metrics → split (table) → bucket (rows) → splitcols (columns)
  const rebuild = (
    schema: AggSchema,
    reordered: AggRow[]
  ): AggRow[] => {
    const m = schema === 'metric' ? reordered : metricRows;
    const s = schema === 'split' ? reordered : splitRows;
    const b = schema === 'bucket' ? reordered : bucketRows;
    const sc = schema === 'splitcols' ? reordered : splitcolsRows;
    return [...m, ...s, ...b, ...sc];
  };

  const updateRow = (id: string, patch: Partial<AggRow>) =>
    onChange(value.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => onChange(value.filter((r) => r.id !== id));

  const reorderSection = (schema: AggSchema, source: number, destination: number) => {
    const section = value.filter((r) => r.schema === schema);
    const [moved] = section.splice(source, 1);
    section.splice(destination, 0, moved);
    onChange(rebuild(schema, section));
  };

  const addRow = (schema: AggSchema) => {
    const newRow = schema === 'metric' ? makeMetricRow() : makeBucketRow(schema);
    const section = [...value.filter((r) => r.schema === schema), newRow];
    onChange(rebuild(schema, section));
  };

  const onDragEnd = (schema: AggSchema) => ({ source, destination }: DropResult) => {
    if (!source || !destination || source.index === destination.index) return;
    reorderSection(schema, source.index, destination.index);
  };

  return (
    <div>
      <AggSection
        title={i18n.translate('enhancedTable2.aggEditor.metricsTitle', { defaultMessage: 'Metrics' })}
        droppableId="metrics"
        rows={metricRows}
        typeOptions={METRIC_TYPES}
        metricRows={[]}
        minRows={1}
        emptyLabel=""
        addLabel={i18n.translate('enhancedTable2.aggEditor.addMetric', { defaultMessage: 'Add metric' })}
        dataView={dataView}
        onAdd={() => addRow('metric')}
        onDragEnd={onDragEnd('metric')}
        onChangeRow={updateRow}
        onRemoveRow={removeRow}
      />

      <EuiSpacer size="m" />

      <AggSection
        title={i18n.translate('enhancedTable2.aggEditor.splitTableTitle', { defaultMessage: 'Split table' })}
        droppableId="split"
        rows={splitRows}
        typeOptions={BUCKET_TYPES}
        metricRows={metricRows}
        minRows={0}
        maxRows={1}
        emptyLabel={i18n.translate('enhancedTable2.aggEditor.noSplitTable', { defaultMessage: 'No split table configured.' })}
        addLabel={i18n.translate('enhancedTable2.aggEditor.addSplitTable', { defaultMessage: 'Add split table' })}
        dataView={dataView}
        onAdd={() => addRow('split')}
        onDragEnd={onDragEnd('split')}
        onChangeRow={updateRow}
        onRemoveRow={removeRow}
      />

      <EuiSpacer size="m" />

      <AggSection
        title={i18n.translate('enhancedTable2.aggEditor.splitRowsTitle', { defaultMessage: 'Split rows' })}
        droppableId="buckets"
        rows={bucketRows}
        typeOptions={BUCKET_TYPES}
        metricRows={metricRows}
        minRows={0}
        emptyLabel={i18n.translate('enhancedTable2.aggEditor.noSplitRows', { defaultMessage: 'No split rows configured.' })}
        addLabel={i18n.translate('enhancedTable2.aggEditor.addSplitRow', { defaultMessage: 'Add split row' })}
        dataView={dataView}
        onAdd={() => addRow('bucket')}
        onDragEnd={onDragEnd('bucket')}
        onChangeRow={updateRow}
        onRemoveRow={removeRow}
      />

      <EuiSpacer size="m" />

      <AggSection
        title={i18n.translate('enhancedTable2.aggEditor.splitColsTitle', { defaultMessage: 'Split columns' })}
        droppableId="splitcols"
        rows={splitcolsRows}
        typeOptions={BUCKET_TYPES}
        metricRows={metricRows}
        minRows={0}
        maxRows={1}
        emptyLabel={i18n.translate('enhancedTable2.aggEditor.noSplitCols', { defaultMessage: 'No split columns configured.' })}
        addLabel={i18n.translate('enhancedTable2.aggEditor.addSplitCol', { defaultMessage: 'Add split columns' })}
        hint={i18n.translate('enhancedTable2.aggEditor.splitColsHint', { defaultMessage: 'This bucket must be the last one.' })}
        dataView={dataView}
        onAdd={() => addRow('splitcols')}
        onDragEnd={onDragEnd('splitcols')}
        onChangeRow={updateRow}
        onRemoveRow={removeRow}
      />
    </div>
  );
};

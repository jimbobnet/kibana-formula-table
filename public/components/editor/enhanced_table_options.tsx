import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { ComputedColumnEditorItem } from './computed_column_editor';
import type { ComputedColumn } from '../../../common/types';

const TOTAL_FUNC_OPTIONS = [
  { value: 'sum', text: 'Sum' },
  { value: 'avg', text: 'Average' },
  { value: 'min', text: 'Min' },
  { value: 'max', text: 'Max' },
  { value: 'count', text: 'Count' },
];

const NEW_COMPUTED_COLUMN: ComputedColumn = {
  label: 'Value squared',
  formula: 'col0 * col0',
  format: 'number',
  pattern: '0,0',
  datePattern: 'YYYY-MM-DD HH:mm:ss',
  durationInputFormat: 'milliseconds',
  durationOutputFormat: 'humanize',
  durationOutputPrecision: 2,
  durationUseShortSuffix: false,
  durationIncludeSpaceWithSuffix: true,
  alignment: 'left',
  applyAlignmentOnTitle: true,
  applyAlignmentOnTotal: true,
  computeTotalUsingFormula: false,
  enabled: true,
  applyTemplate: false,
  applyTemplateOnTotal: false,
  template: '',
  cellComputedCss: '',
};

export const EnhancedTableOptions: React.FC<VisEditorOptionsProps<any>> = ({
  stateParams,
  setValue,
  setValidity,
}) => {
  useEffect(() => {
    setValidity(true);
  }, [setValidity]);

  const updateComputedColumn = (index: number, updated: ComputedColumn) => {
    const cols = [...(stateParams.computedColumns ?? [])];
    cols[index] = updated;
    setValue('computedColumns', cols);
  };

  const removeComputedColumn = (index: number) => {
    const cols = (stateParams.computedColumns ?? []).filter((_, i) => i !== index);
    setValue('computedColumns', cols);
  };

  return (
    <div>
      {/* BASIC SETTINGS */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{i18n.translate('enhancedTable2.options.basicSettings', { defaultMessage: 'Basic settings' })}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFormRow label={i18n.translate('enhancedTable2.options.perPage', { defaultMessage: 'Rows per page' })} display="rowCompressed">
          <EuiFieldNumber
            compressed
            min={1}
            max={10000}
            value={stateParams.perPage}
            onChange={(e) => setValue('perPage', parseInt(e.target.value, 10) || 10)}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />

        {'showPartialRows' in stateParams && (
          <>
            <EuiSwitch
              compressed
              label={i18n.translate('enhancedTable2.options.showPartialRows', { defaultMessage: 'Show partial rows' })}
              checked={(stateParams as any).showPartialRows ?? false}
              onChange={(e) => setValue('showPartialRows' as any, e.target.checked)}
            />
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={i18n.translate('enhancedTable2.options.showMetricsAtAllLevels', { defaultMessage: 'Show metrics at all levels' })}
              checked={(stateParams as any).showMetricsAtAllLevels ?? false}
              onChange={(e) => setValue('showMetricsAtAllLevels' as any, e.target.checked)}
            />
            <EuiSpacer size="s" />
          </>
        )}

        <EuiSwitch
          compressed
          label={i18n.translate('enhancedTable2.options.stripedRows', { defaultMessage: 'Striped rows' })}
          checked={stateParams.stripedRows}
          onChange={(e) => setValue('stripedRows', e.target.checked)}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          compressed
          label={i18n.translate('enhancedTable2.options.addRowNumberColumn', { defaultMessage: 'Add row number column' })}
          checked={stateParams.addRowNumberColumn}
          onChange={(e) => setValue('addRowNumberColumn', e.target.checked)}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          compressed
          label={i18n.translate('enhancedTable2.options.sortSplitCols', { defaultMessage: 'Sort split tables' })}
          checked={(stateParams as any).sortSplitCols ?? false}
          onChange={(e) => setValue('sortSplitCols' as any, e.target.checked)}
        />
        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('enhancedTable2.options.hiddenColumns', { defaultMessage: 'Hidden columns' })}
          helpText={i18n.translate('enhancedTable2.options.hiddenColumnsHelp', { defaultMessage: 'Comma-separated column indices to hide (e.g. 0,2)' })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            placeholder="0,2"
            value={stateParams.hiddenColumns ?? ''}
            onChange={(e) => setValue('hiddenColumns', e.target.value)}
          />
        </EuiFormRow>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* TOTALS */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{i18n.translate('enhancedTable2.options.totals', { defaultMessage: 'Column totals' })}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiSwitch
          compressed
          label={i18n.translate('enhancedTable2.options.showTotal', { defaultMessage: 'Show column totals' })}
          checked={stateParams.showTotal}
          onChange={(e) => setValue('showTotal', e.target.checked)}
        />

        {stateParams.showTotal && (
          <>
            <EuiSpacer size="s" />
            <EuiFormRow label={i18n.translate('enhancedTable2.options.totalFunc', { defaultMessage: 'Total function' })} display="rowCompressed">
              <EuiSelect
                compressed
                options={TOTAL_FUNC_OPTIONS}
                value={stateParams.totalFunc}
                onChange={(e) => setValue('totalFunc', e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              label={i18n.translate('enhancedTable2.options.totalLabel', { defaultMessage: 'Total row label' })}
              helpText={i18n.translate('enhancedTable2.options.totalLabelHelp', { defaultMessage: 'Label shown in the first column of the totals row' })}
              display="rowCompressed"
            >
              <EuiFieldText
                compressed
                placeholder={i18n.translate('enhancedTable2.options.totalLabelPlaceholder', { defaultMessage: 'Total' })}
                value={stateParams.totalLabel ?? ''}
                onChange={(e) => setValue('totalLabel', e.target.value)}
              />
            </EuiFormRow>
          </>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* FILTER BAR */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{i18n.translate('enhancedTable2.options.filterBar', { defaultMessage: 'Filter bar' })}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiSwitch
          compressed
          label={i18n.translate('enhancedTable2.options.showFilterBar', { defaultMessage: 'Show filter bar' })}
          checked={stateParams.showFilterBar ?? false}
          onChange={(e) => setValue('showFilterBar', e.target.checked)}
        />

        {stateParams.showFilterBar && (
          <>
            <EuiSpacer size="s" />
            <EuiFormRow
              label={i18n.translate('enhancedTable2.options.filterBarWidth', { defaultMessage: 'Filter bar width' })}
              display="rowCompressed"
            >
              <EuiFieldText
                compressed
                placeholder="50%"
                value={stateParams.filterBarWidth ?? '50%'}
                onChange={(e) => setValue('filterBarWidth', e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={i18n.translate('enhancedTable2.options.filterCaseSensitive', { defaultMessage: 'Case sensitive' })}
              checked={stateParams.filterCaseSensitive ?? false}
              onChange={(e) => setValue('filterCaseSensitive', e.target.checked)}
            />
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={i18n.translate('enhancedTable2.options.filterTermsSeparately', { defaultMessage: 'Match all terms separately' })}
              checked={stateParams.filterTermsSeparately ?? false}
              onChange={(e) => setValue('filterTermsSeparately', e.target.checked)}
            />
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={i18n.translate('enhancedTable2.options.filterBarHideable', { defaultMessage: 'Filter bar hideable' })}
              checked={stateParams.filterBarHideable ?? false}
              onChange={(e) => setValue('filterBarHideable', e.target.checked)}
            />
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={i18n.translate('enhancedTable2.options.filterHighlightResults', { defaultMessage: 'Highlight matching text' })}
              checked={stateParams.filterHighlightResults ?? false}
              onChange={(e) => setValue('filterHighlightResults', e.target.checked)}
            />
          </>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* ROW FORMULAS */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{i18n.translate('enhancedTable2.options.rowFormulas', { defaultMessage: 'Row formulas' })}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('enhancedTable2.options.rowComputedFilter', { defaultMessage: 'Row filter formula' })}
          helpText={i18n.translate('enhancedTable2.options.rowComputedFilterHelp', { defaultMessage: 'Truthy = show row. Variables: col0…colN, formattedCol0…, totalHits. Example: col0 > 10' })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            placeholder="col0 > 10"
            value={stateParams.rowComputedFilter ?? ''}
            onChange={(e) => setValue('rowComputedFilter', e.target.value)}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('enhancedTable2.options.rowComputedCss', { defaultMessage: 'Row CSS formula' })}
          helpText={i18n.translate('enhancedTable2.options.rowComputedCssHelp', { defaultMessage: 'Returns CSS string applied to the entire row. Example: col0 < 0 ? "background-color: #fdd" : ""' })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            placeholder='col0 < 0 ? "background-color: #fdd" : ""'
            value={stateParams.rowComputedCss ?? ''}
            onChange={(e) => setValue('rowComputedCss', e.target.value)}
          />
        </EuiFormRow>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* COMPUTED COLUMNS */}
      <EuiPanel paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{i18n.translate('enhancedTable2.options.computedColumns', { defaultMessage: 'Computed columns' })}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="plusInCircle"
              onClick={() => setValue('computedColumns', [...(stateParams.computedColumns ?? []), { ...NEW_COMPUTED_COLUMN }])}
            >
              {i18n.translate('enhancedTable2.options.addComputedColumn', { defaultMessage: 'Add column' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        {(stateParams.computedColumns ?? []).map((cc, idx) => (
          <React.Fragment key={idx}>
            <ComputedColumnEditorItem
              column={cc}
              index={idx}
              onChange={(updated) => updateComputedColumn(idx, updated)}
              onRemove={() => removeComputedColumn(idx)}
            />
            <EuiSpacer size="xs" />
          </React.Fragment>
        ))}
      </EuiPanel>
    </div>
  );
};

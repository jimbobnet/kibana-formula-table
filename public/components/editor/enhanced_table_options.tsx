import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
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
  alignment: 'left',
  applyAlignmentOnTitle: true,
  applyAlignmentOnTotal: true,
  computeTotalUsingFormula: false,
  enabled: true,
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
          </>
        )}
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

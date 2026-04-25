import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';
import type { ComputedColumn } from '../../../common/types';

interface ComputedColumnEditorProps {
  column: ComputedColumn;
  index: number;
  onChange: (updated: ComputedColumn) => void;
  onRemove: () => void;
}

const FORMAT_OPTIONS = [
  { value: 'string', text: 'String' },
  { value: 'number', text: 'Number' },
  { value: 'date', text: 'Date' },
];

export const ComputedColumnEditorItem: React.FC<ComputedColumnEditorProps> = ({
  column,
  index,
  onChange,
  onRemove,
}) => {
  const update = (patch: Partial<ComputedColumn>) => onChange({ ...column, ...patch });

  return (
    <EuiAccordion
      id={`computed_col_${index}`}
      buttonContent={column.label || i18n.translate('enhancedTable2.computedColumn.unnamed', { defaultMessage: 'Computed column {n}', values: { n: index + 1 } })}
      extraAction={
        <EuiButtonIcon iconType="trash" aria-label="Remove column" color="danger" onClick={onRemove} />
      }
      paddingSize="s"
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow label={i18n.translate('enhancedTable2.computedColumn.label', { defaultMessage: 'Label' })} display="rowCompressed">
            <EuiFieldText compressed value={column.label} onChange={(e) => update({ label: e.target.value })} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('enhancedTable2.computedColumn.formula', { defaultMessage: 'Formula' })}
            helpText="Use col0, col1, ... to reference columns by index"
            display="rowCompressed"
          >
            <EuiFieldText compressed value={column.formula} onChange={(e) => update({ formula: e.target.value })} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={i18n.translate('enhancedTable2.computedColumn.format', { defaultMessage: 'Format' })} display="rowCompressed">
            <EuiSelect compressed options={FORMAT_OPTIONS} value={column.format} onChange={(e) => update({ format: e.target.value as ComputedColumn['format'] })} />
          </EuiFormRow>
        </EuiFlexItem>
        {column.format === 'number' && (
          <EuiFlexItem>
            <EuiFormRow label="Pattern" display="rowCompressed">
              <EuiFieldText compressed value={column.pattern ?? '0,0'} onChange={(e) => update({ pattern: e.target.value })} />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiSwitch
            compressed
            label={i18n.translate('enhancedTable2.computedColumn.enabled', { defaultMessage: 'Enabled' })}
            checked={column.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

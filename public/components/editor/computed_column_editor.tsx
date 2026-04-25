import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFieldNumber,
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
  { value: 'duration', text: 'Duration' },
];

const DURATION_INPUT_OPTIONS = [
  { value: 'milliseconds', text: 'Milliseconds' },
  { value: 'seconds', text: 'Seconds' },
  { value: 'minutes', text: 'Minutes' },
  { value: 'hours', text: 'Hours' },
  { value: 'days', text: 'Days' },
  { value: 'weeks', text: 'Weeks' },
  { value: 'months', text: 'Months' },
  { value: 'years', text: 'Years' },
];

const DURATION_OUTPUT_OPTIONS = [
  { value: 'humanize', text: 'Humanize' },
  { value: 'humanizeVeryPrecise', text: 'Humanize (very precise)' },
  { value: 'asMilliseconds', text: 'As milliseconds' },
  { value: 'asSeconds', text: 'As seconds' },
  { value: 'asMinutes', text: 'As minutes' },
  { value: 'asHours', text: 'As hours' },
  { value: 'asDays', text: 'As days' },
  { value: 'asWeeks', text: 'As weeks' },
  { value: 'asMonths', text: 'As months' },
  { value: 'asYears', text: 'As years' },
];

export const ComputedColumnEditorItem: React.FC<ComputedColumnEditorProps> = ({
  column,
  index,
  onChange,
  onRemove,
}) => {
  const update = (patch: Partial<ComputedColumn>) => onChange({ ...column, ...patch });
  const isAsFormat = (column.durationOutputFormat ?? 'humanize').startsWith('as');
  const isVeryPrecise = column.durationOutputFormat === 'humanizeVeryPrecise';

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
            helpText="Use col0, col1, formattedCol0, cell(-1, 0), now() to reference data"
            display="rowCompressed"
          >
            <EuiFieldText compressed value={column.formula} onChange={(e) => update({ formula: e.target.value })} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={i18n.translate('enhancedTable2.computedColumn.format', { defaultMessage: 'Format' })} display="rowCompressed">
            <EuiSelect
              compressed
              options={FORMAT_OPTIONS}
              value={column.format}
              onChange={(e) => update({ format: e.target.value as ComputedColumn['format'] })}
            />
          </EuiFormRow>
        </EuiFlexItem>

        {column.format === 'number' && (
          <EuiFlexItem>
            <EuiFormRow label="Pattern (numeral.js)" display="rowCompressed">
              <EuiFieldText
                compressed
                placeholder="0,0"
                value={column.pattern ?? '0,0'}
                onChange={(e) => update({ pattern: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}

        {column.format === 'date' && (
          <EuiFlexItem>
            <EuiFormRow label="Date pattern (moment.js)" display="rowCompressed">
              <EuiFieldText
                compressed
                placeholder="YYYY-MM-DD HH:mm:ss"
                value={column.datePattern ?? ''}
                onChange={(e) => update({ datePattern: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}

        {column.format === 'duration' && (
          <>
            <EuiFlexItem>
              <EuiFormRow label="Input unit" display="rowCompressed">
                <EuiSelect
                  compressed
                  options={DURATION_INPUT_OPTIONS}
                  value={column.durationInputFormat ?? 'milliseconds'}
                  onChange={(e) =>
                    update({ durationInputFormat: e.target.value as ComputedColumn['durationInputFormat'] })
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Output format" display="rowCompressed">
                <EuiSelect
                  compressed
                  options={DURATION_OUTPUT_OPTIONS}
                  value={column.durationOutputFormat ?? 'humanize'}
                  onChange={(e) =>
                    update({ durationOutputFormat: e.target.value as ComputedColumn['durationOutputFormat'] })
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
            {isAsFormat && (
              <EuiFlexItem>
                <EuiFormRow label="Output precision (decimal places)" display="rowCompressed">
                  <EuiFieldNumber
                    compressed
                    min={0}
                    max={10}
                    value={column.durationOutputPrecision ?? 2}
                    onChange={(e) =>
                      update({ durationOutputPrecision: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
            {isVeryPrecise && (
              <>
                <EuiFlexItem>
                  <EuiSwitch
                    compressed
                    label="Use short suffix (h, min, s)"
                    checked={column.durationUseShortSuffix ?? false}
                    onChange={(e) => update({ durationUseShortSuffix: e.target.checked })}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSwitch
                    compressed
                    label="Space between number and suffix"
                    checked={column.durationIncludeSpaceWithSuffix ?? true}
                    onChange={(e) => update({ durationIncludeSpaceWithSuffix: e.target.checked })}
                  />
                </EuiFlexItem>
              </>
            )}
          </>
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

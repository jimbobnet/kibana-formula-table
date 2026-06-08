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
  EuiIcon,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import type { ComputedColumn } from '../../../common/types';

interface ComputedColumnEditorProps {
  column: ComputedColumn;
  index: number;
  onChange: (updated: ComputedColumn) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
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
  dragHandleProps,
}) => {
  const update = (patch: Partial<ComputedColumn>) => onChange({ ...column, ...patch });
  const isAsFormat = (column.durationOutputFormat ?? 'humanize').startsWith('as');
  const isVeryPrecise = column.durationOutputFormat === 'humanizeVeryPrecise';

  return (
    <EuiAccordion
      id={`computed_col_${index}`}
      buttonContent={column.label || i18n.translate('formulaTable.computedColumn.unnamed', { defaultMessage: 'Computed column {n}', values: { n: index + 1 } })}
      extraAction={
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          {dragHandleProps && (
            <EuiFlexItem grow={false}>
              <div
                {...dragHandleProps}
                aria-label={i18n.translate('formulaTable.computedColumn.dragToReorder', { defaultMessage: 'Drag to reorder' })}
              >
                <EuiIcon type="grab" />
              </div>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={column.enabled ? 'eye' : 'eyeClosed'}
              aria-label={
                column.enabled
                  ? i18n.translate('formulaTable.computedColumn.hideColumn', { defaultMessage: 'Hide column' })
                  : i18n.translate('formulaTable.computedColumn.showColumn', { defaultMessage: 'Show column' })
              }
              color={column.enabled ? 'text' : 'subdued'}
              onClick={() => update({ enabled: !column.enabled })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate('formulaTable.computedColumn.removeColumn', { defaultMessage: 'Remove column' })}
              color="danger"
              onClick={onRemove}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="s"
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow label={i18n.translate('formulaTable.computedColumn.label', { defaultMessage: 'Label' })} display="rowCompressed">
            <EuiFieldText compressed value={column.label} onChange={(e) => update({ label: e.target.value })} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('formulaTable.computedColumn.formula', { defaultMessage: 'Formula' })}
            helpText="Use col0, col1, formattedCol0, cell(-1, 0), now() to reference data"
            display="rowCompressed"
          >
            <EuiFieldText compressed value={column.formula} onChange={(e) => update({ formula: e.target.value })} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={i18n.translate('formulaTable.computedColumn.format', { defaultMessage: 'Format' })} display="rowCompressed">
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
          <EuiFormRow
            label={i18n.translate('formulaTable.computedColumn.alignment', { defaultMessage: 'Text alignment' })}
            display="rowCompressed"
          >
            <EuiSelect
              compressed
              options={[
                { value: 'left',    text: i18n.translate('formulaTable.computedColumn.alignLeft',    { defaultMessage: 'Left' }) },
                { value: 'center',  text: i18n.translate('formulaTable.computedColumn.alignCenter',  { defaultMessage: 'Center' }) },
                { value: 'right',   text: i18n.translate('formulaTable.computedColumn.alignRight',   { defaultMessage: 'Right' }) },
                { value: 'justify', text: i18n.translate('formulaTable.computedColumn.alignJustify', { defaultMessage: 'Justify' }) },
              ]}
              value={column.alignment}
              onChange={(e) => update({ alignment: e.target.value as ComputedColumn['alignment'] })}
            />
          </EuiFormRow>
        </EuiFlexItem>

        {column.alignment !== 'left' && (
          <>
            <EuiFlexItem>
              <EuiSwitch
                compressed
                label={i18n.translate('formulaTable.computedColumn.applyAlignmentOnTitle', { defaultMessage: 'Apply alignment on title' })}
                checked={column.applyAlignmentOnTitle}
                onChange={(e) => update({ applyAlignmentOnTitle: e.target.checked })}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                compressed
                label={i18n.translate('formulaTable.computedColumn.applyAlignmentOnTotal', { defaultMessage: 'Apply alignment on total' })}
                checked={column.applyAlignmentOnTotal}
                onChange={(e) => update({ applyAlignmentOnTotal: e.target.checked })}
              />
            </EuiFlexItem>
          </>
        )}

        <EuiFlexItem>
          <EuiSpacer size="xs" />
          <EuiSwitch
            compressed
            label={i18n.translate('formulaTable.computedColumn.applyTemplate', { defaultMessage: 'Apply Handlebars template' })}
            checked={column.applyTemplate ?? false}
            onChange={(e) => update({ applyTemplate: e.target.checked })}
          />
        </EuiFlexItem>

        {column.applyTemplate && (
          <>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('formulaTable.computedColumn.template', { defaultMessage: 'Template' })}
                helpText="Variables: {{value}}, {{rawValue}}, {{col0}}, {{formattedCol0}}, {{total0}}, {{totalHits}}, {{encodeURIComponent col0}}"
                display="rowCompressed"
              >
                <EuiTextArea
                  compressed
                  rows={3}
                  placeholder='<a href="/path?q={{encodeURIComponent col0}}">{{value}}</a>'
                  value={column.template ?? ''}
                  onChange={(e) => update({ template: e.target.value })}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                compressed
                label={i18n.translate('formulaTable.computedColumn.applyTemplateOnTotal', { defaultMessage: 'Apply template on total row' })}
                checked={column.applyTemplateOnTotal ?? false}
                onChange={(e) => update({ applyTemplateOnTotal: e.target.checked })}
              />
            </EuiFlexItem>
          </>
        )}

        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('formulaTable.computedColumn.cellComputedCss', { defaultMessage: 'Cell CSS formula' })}
            helpText="Returns CSS string applied to this cell. Variables: value, rawValue, col0…colN. Example: value < 0 ? &quot;color: red&quot; : &quot;&quot;"
            display="rowCompressed"
          >
            <EuiFieldText
              compressed
              placeholder='value < 0 ? "color: red; font-weight: bold" : ""'
              value={column.cellComputedCss ?? ''}
              onChange={(e) => update({ cellComputedCss: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={
              <>
                {i18n.translate('formulaTable.computedColumn.customColumnPosition', { defaultMessage: 'Custom column position' })}
                {' '}
                <EuiIconTip
                  content={i18n.translate('formulaTable.computedColumn.customColumnPositionHelp', {
                    defaultMessage: "You can change here the computed column target position to a previous position. For example, '0' will move this column at first position. Despite 'target' column position, formula can reference any previous column to the 'declared' column position, including classic and computed columns.",
                  })}
                  position="right"
                />
              </>
            }
            display="rowCompressed"
          >
            <EuiFieldNumber
              compressed
              min={0}
              placeholder={i18n.translate('formulaTable.computedColumn.customColumnPositionPlaceholder', { defaultMessage: '(default)' })}
              value={column.customColumnPosition ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                update({ customColumnPosition: isNaN(v) ? undefined : v });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

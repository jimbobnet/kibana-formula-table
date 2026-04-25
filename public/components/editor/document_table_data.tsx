import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
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
import type { DocumentTableParams, FieldColumn } from '../../../common/types';

const SORT_ORDER_OPTIONS = [
  { value: 'desc', text: i18n.translate('enhancedTable2.docTable.descending', { defaultMessage: 'Descending' }) },
  { value: 'asc', text: i18n.translate('enhancedTable2.docTable.ascending', { defaultMessage: 'Ascending' }) },
];

const NEW_FIELD_COLUMN: FieldColumn = {
  label: '',
  field: { name: '' },
  enabled: true,
};

export const DocumentTableData: React.FC<VisEditorOptionsProps<DocumentTableParams>> = ({
  stateParams,
  setValue,
  setValidity,
  aggs,
}) => {
  const isValid =
    typeof stateParams.hitsSize === 'number' && stateParams.hitsSize > 0;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  const fieldColumns = stateParams.fieldColumns ?? [];
  const sortableFields = (aggs?.indexPattern?.fields ?? []).filter(
    (f: any) => f.sortable
  );
  const sortFieldOptions = [
    { value: '_score', text: '_score' },
    ...sortableFields.map((f: any) => ({ value: f.name, text: f.name })),
  ];

  const allFields = (aggs?.indexPattern?.fields ?? []).map((f: any) => ({
    value: f.name,
    text: f.name,
  }));
  const fieldOptions = [
    { value: '_source', text: '_source (full document)' },
    ...allFields,
  ];

  const updateFieldColumn = (index: number, patch: Partial<FieldColumn>) => {
    const cols = [...fieldColumns];
    cols[index] = { ...cols[index], ...patch };
    setValue('fieldColumns', cols);
  };

  const removeFieldColumn = (index: number) => {
    setValue('fieldColumns', fieldColumns.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* FIELD COLUMNS */}
      <EuiPanel paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{i18n.translate('enhancedTable2.docTable.fieldColumns', { defaultMessage: 'Field columns' })}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="plusInCircle"
              onClick={() => setValue('fieldColumns', [...fieldColumns, { ...NEW_FIELD_COLUMN }])}
            >
              {i18n.translate('enhancedTable2.docTable.addColumn', { defaultMessage: 'Add column' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {fieldColumns.map((col, idx) => (
          <EuiPanel key={idx} paddingSize="s" hasBorder>
            <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('enhancedTable2.docTable.field', { defaultMessage: 'Field' })}
                  display="rowCompressed"
                >
                  {fieldOptions.length > 0 ? (
                    <EuiSelect
                      compressed
                      options={fieldOptions}
                      value={col.field?.name ?? ''}
                      onChange={(e) =>
                        updateFieldColumn(idx, { field: { ...col.field, name: e.target.value } })
                      }
                    />
                  ) : (
                    <EuiFieldText
                      compressed
                      placeholder="_source"
                      value={col.field?.name ?? ''}
                      onChange={(e) =>
                        updateFieldColumn(idx, { field: { ...col.field, name: e.target.value } })
                      }
                    />
                  )}
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('enhancedTable2.docTable.label', { defaultMessage: 'Label' })}
                  display="rowCompressed"
                >
                  <EuiFieldText
                    compressed
                    placeholder={col.field?.name ?? ''}
                    value={col.label}
                    onChange={(e) => updateFieldColumn(idx, { label: e.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={i18n.translate('enhancedTable2.docTable.enabled', { defaultMessage: 'On' })}
                  checked={col.enabled !== false}
                  onChange={(e) => updateFieldColumn(idx, { enabled: e.target.checked })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="trash"
                  aria-label="Remove field column"
                  color="danger"
                  onClick={() => removeFieldColumn(idx)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ))}
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* HITS / SORT */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{i18n.translate('enhancedTable2.docTable.querySettings', { defaultMessage: 'Query settings' })}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('enhancedTable2.docTable.hitsSize', { defaultMessage: 'Maximum rows' })}
          display="rowCompressed"
          isInvalid={!isValid}
          error={i18n.translate('enhancedTable2.docTable.hitsSizeError', { defaultMessage: 'Must be greater than 0' })}
        >
          <EuiFieldNumber
            compressed
            min={1}
            max={10000}
            value={stateParams.hitsSize}
            isInvalid={!isValid}
            onChange={(e) => setValue('hitsSize', parseInt(e.target.value, 10) || 10)}
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('enhancedTable2.docTable.sortField', { defaultMessage: 'Sort field' })}
          display="rowCompressed"
        >
          {sortFieldOptions.length > 1 ? (
            <EuiSelect
              compressed
              options={sortFieldOptions}
              value={stateParams.sortField?.name ?? '_score'}
              onChange={(e) => setValue('sortField', { name: e.target.value })}
            />
          ) : (
            <EuiFieldText
              compressed
              value={stateParams.sortField?.name ?? '_score'}
              onChange={(e) => setValue('sortField', { name: e.target.value })}
            />
          )}
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('enhancedTable2.docTable.sortOrder', { defaultMessage: 'Sort order' })}
          display="rowCompressed"
        >
          <EuiSelect
            compressed
            options={SORT_ORDER_OPTIONS}
            value={stateParams.sortOrder}
            onChange={(e) => setValue('sortOrder', e.target.value as 'asc' | 'desc')}
          />
        </EuiFormRow>
      </EuiPanel>
    </div>
  );
};

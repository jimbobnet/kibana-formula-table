import React, { useEffect } from 'react';
import type { DropResult } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
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
  EuiTitle,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocumentTableParams, FieldColumn } from '../../../common/types';

interface DocumentTableDataProps {
  stateParams: DocumentTableParams;
  setValue: <K extends keyof DocumentTableParams>(key: K, value: DocumentTableParams[K]) => void;
  setValidity: (isValid: boolean) => void;
  dataView?: DataView;
}

const SORT_ORDER_OPTIONS = [
  { value: 'desc', text: i18n.translate('formulaTable.docTable.descending', { defaultMessage: 'Descending' }) },
  { value: 'asc', text: i18n.translate('formulaTable.docTable.ascending', { defaultMessage: 'Ascending' }) },
];

const NEW_FIELD_COLUMN: FieldColumn = {
  label: '',
  field: { name: '' },
  enabled: true,
};

export const DocumentTableData: React.FC<DocumentTableDataProps> = ({
  stateParams,
  setValue,
  setValidity,
  dataView,
}) => {
  const isValid =
    typeof stateParams.hitsSize === 'number' && stateParams.hitsSize > 0;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  const fieldColumns = stateParams.fieldColumns ?? [];
  const sortableFields = (dataView?.fields ?? []).filter(
    (f: any) => f.sortable
  );
  const sortFieldOptions = [
    { value: '_score', text: '_score' },
    ...sortableFields.map((f: any) => ({ value: f.name, text: f.name })),
  ];

  const allFields = (dataView?.fields ?? []).map((f: any) => ({
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

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!source || !destination || source.index === destination.index) return;
    const cols = [...fieldColumns];
    const [moved] = cols.splice(source.index, 1);
    cols.splice(destination.index, 0, moved);
    setValue('fieldColumns', cols);
  };

  return (
    <div>
      {/* FIELD COLUMNS */}
      <EuiPanel paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{i18n.translate('formulaTable.docTable.fieldColumns', { defaultMessage: 'Field columns' })}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="plusInCircle"
              onClick={() => setValue('fieldColumns', [...fieldColumns, { ...NEW_FIELD_COLUMN }])}
            >
              {i18n.translate('formulaTable.docTable.addColumn', { defaultMessage: 'Add column' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="fieldColumns" spacing="s">
            <>
              {fieldColumns.map((col, idx) => (
                <EuiDraggable
                  key={`field-col-${idx}`}
                  index={idx}
                  draggableId={`field-col-${idx}`}
                  customDragHandle={true}
                  spacing="s"
                >
                  {(provided) => (
                    <EuiPanel paddingSize="s" hasBorder>
                      <EuiFlexGroup alignItems="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <div
                            {...provided.dragHandleProps}
                            aria-label={i18n.translate('formulaTable.docTable.dragToReorder', { defaultMessage: 'Drag to reorder' })}
                          >
                            <EuiIcon type="grab" />
                          </div>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiFormRow
                            label={i18n.translate('formulaTable.docTable.field', { defaultMessage: 'Field' })}
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
                            label={i18n.translate('formulaTable.docTable.label', { defaultMessage: 'Label' })}
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
                          <EuiButtonIcon
                            iconType={col.enabled !== false ? 'eye' : 'eyeClosed'}
                            aria-label={
                              col.enabled !== false
                                ? i18n.translate('formulaTable.docTable.hideColumn', { defaultMessage: 'Hide column' })
                                : i18n.translate('formulaTable.docTable.showColumn', { defaultMessage: 'Show column' })
                            }
                            color={col.enabled !== false ? 'text' : 'subdued'}
                            onClick={() => updateFieldColumn(idx, { enabled: col.enabled === false })}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType="cross"
                            aria-label={i18n.translate('formulaTable.docTable.removeColumn', { defaultMessage: 'Remove field column' })}
                            color="danger"
                            onClick={() => removeFieldColumn(idx)}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  )}
                </EuiDraggable>
              ))}
            </>
          </EuiDroppable>
        </EuiDragDropContext>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* HITS / SORT */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{i18n.translate('formulaTable.docTable.querySettings', { defaultMessage: 'Query settings' })}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('formulaTable.docTable.hitsSize', { defaultMessage: 'Maximum rows' })}
          display="rowCompressed"
          isInvalid={!isValid}
          error={i18n.translate('formulaTable.docTable.hitsSizeError', { defaultMessage: 'Must be greater than 0' })}
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
          label={i18n.translate('formulaTable.docTable.sortField', { defaultMessage: 'Sort field' })}
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
          label={i18n.translate('formulaTable.docTable.sortOrder', { defaultMessage: 'Sort order' })}
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

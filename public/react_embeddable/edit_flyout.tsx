import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { EnhancedTableParams, DocumentTableParams } from '../../common/types';
import { EnhancedTableOptions } from '../components/editor/enhanced_table_options';
import { DocumentTableData } from '../components/editor/document_table_data';
import {
  AggConfigsEditor,
  needsField,
  parseAggRowsFromConfig,
  serializeAggRows,
} from '../components/editor/agg_configs_editor';
import type { AggRow } from '../components/editor/agg_configs_editor';
import { getDataViewsStart } from '../services';
import { PanelFilterEditor } from './filter_editor';

// ─── Enhanced Table ────────────────────────────────────────────────────────────

interface EnhancedFlyoutProps {
  indexId: string | undefined;
  aggConfigs: unknown[];
  schemas: Record<string, number[]>;
  params: EnhancedTableParams;
  filters: Filter[];
  onSave: (update: {
    indexId: string;
    aggConfigs: unknown[];
    schemas: Record<string, number[]>;
    params: EnhancedTableParams;
    filters: Filter[];
  }) => void;
  onClose: () => void;
}

export const EnhancedTableEditFlyout: React.FC<EnhancedFlyoutProps> = ({
  indexId,
  aggConfigs,
  schemas,
  params,
  filters,
  onSave,
  onClose,
}) => {
  const [localIndexId, setLocalIndexId] = useState(indexId ?? '');
  const [localAggRows, setLocalAggRows] = useState<AggRow[]>(() =>
    parseAggRowsFromConfig(aggConfigs, schemas)
  );
  const [localParams, setLocalParams] = useState<EnhancedTableParams>({ ...params });
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters ?? []);
  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [activeTab, setActiveTab] = useState<'query' | 'filters' | 'display'>('query');

  useEffect(() => {
    getDataViewsStart().getIdsWithTitle().then(setDataViewList).catch(() => {});
  }, []);

  useEffect(() => {
    if (!localIndexId) { setDataView(undefined); return; }
    getDataViewsStart().get(localIndexId).then(setDataView).catch(() => setDataView(undefined));
  }, [localIndexId]);

  const dvOptions: EuiComboBoxOptionOption<string>[] = dataViewList.map((dv) => ({
    label: dv.name ?? dv.title,
    value: dv.id,
  }));

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!localIndexId) {
      errs.push(i18n.translate('formulaTable.editFlyout.errorNoDataView', { defaultMessage: 'A data view must be selected.' }));
    }
    localAggRows.forEach((row, i) => {
      if (row.enabled && needsField(row.type) && !row.params.field) {
        errs.push(i18n.translate('formulaTable.editFlyout.errorAggNoField', {
          defaultMessage: 'Aggregation #{num} ({type}) requires a field.',
          values: { num: i + 1, type: row.type },
        }));
      }
    });
    return errs;
  }, [localIndexId, localAggRows]);

  const handleSave = () => {
    if (errors.length > 0) return;
    const { aggConfigs: serializedAggConfigs, schemas: serializedSchemas } =
      serializeAggRows(localAggRows);
    onSave({
      indexId: localIndexId,
      aggConfigs: serializedAggConfigs,
      schemas: serializedSchemas,
      params: localParams,
      filters: localFilters,
    });
    onClose();
  };

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{i18n.translate('formulaTable.editFlyout.enhancedTitle', { defaultMessage: 'Edit Formula Table' })}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs>
          <EuiTab isSelected={activeTab === 'query'} onClick={() => setActiveTab('query')}>
            {i18n.translate('formulaTable.editFlyout.tabQuery', { defaultMessage: 'Query' })}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'filters'} onClick={() => setActiveTab('filters')}>
            {i18n.translate('formulaTable.editFlyout.tabFilters', { defaultMessage: 'Filters' })}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'display'} onClick={() => setActiveTab('display')}>
            {i18n.translate('formulaTable.editFlyout.tabDisplay', { defaultMessage: 'Display' })}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="m" />

        {activeTab === 'query' && (
          <>
            <EuiFormRow
              label={i18n.translate('formulaTable.editFlyout.dataView', { defaultMessage: 'Data view' })}
              display="rowCompressed"
            >
              <EuiComboBox
                compressed
                singleSelection={{ asPlainText: true }}
                options={dvOptions}
                selectedOptions={dvOptions.filter((o) => o.value === localIndexId)}
                onChange={(selected) => setLocalIndexId(selected[0]?.value ?? '')}
                isClearable={false}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />

            <AggConfigsEditor
              value={localAggRows}
              onChange={setLocalAggRows}
              dataView={dataView}
            />
          </>
        )}

        {activeTab === 'filters' && (
          <PanelFilterEditor
            filters={localFilters}
            dataView={dataView}
            onChange={setLocalFilters}
          />
        )}

        {activeTab === 'display' && (
          <EnhancedTableOptions
            stateParams={localParams}
            setValue={(key, value) => setLocalParams((prev) => ({ ...prev, [key]: value }))}
            setValidity={() => {}}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {errors.length > 0 && (
          <>
            <EuiCallOut
              color="danger"
              iconType="error"
              size="s"
              title={i18n.translate('formulaTable.editFlyout.validationTitle', { defaultMessage: 'Fix the following before applying:' })}
            >
              <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                {errors.map((msg, idx) => <li key={idx}>{msg}</li>)}
              </ul>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('formulaTable.editFlyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} isDisabled={errors.length > 0}>
              {i18n.translate('formulaTable.editFlyout.apply', { defaultMessage: 'Apply changes' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// ─── Document Table ────────────────────────────────────────────────────────────

interface DocumentFlyoutProps {
  indexId: string | undefined;
  params: DocumentTableParams;
  filters: Filter[];
  onSave: (update: { indexId: string; params: DocumentTableParams; filters: Filter[] }) => void;
  onClose: () => void;
}

export const DocumentTableEditFlyout: React.FC<DocumentFlyoutProps> = ({
  indexId,
  params,
  filters,
  onSave,
  onClose,
}) => {
  const [localIndexId, setLocalIndexId] = useState(indexId ?? '');
  const [localParams, setLocalParams] = useState<DocumentTableParams>({ ...params });
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters ?? []);
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'columns' | 'filters' | 'display'>('columns');

  useEffect(() => {
    getDataViewsStart().getIdsWithTitle().then(setDataViewList).catch(() => {});
  }, []);

  useEffect(() => {
    if (!localIndexId) { setDataView(undefined); return; }
    getDataViewsStart()
      .get(localIndexId)
      .then(setDataView)
      .catch(() => setDataView(undefined));
  }, [localIndexId]);

  const dvOptions: EuiComboBoxOptionOption<string>[] = dataViewList.map((dv) => ({
    label: dv.name ?? dv.title,
    value: dv.id,
  }));

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!localIndexId) {
      errs.push(i18n.translate('formulaTable.editFlyout.errorNoDataView', { defaultMessage: 'A data view must be selected.' }));
    }
    (localParams.fieldColumns ?? []).forEach((col, i) => {
      if (col.enabled !== false && !col.field?.name) {
        errs.push(i18n.translate('formulaTable.editFlyout.errorColumnNoField', {
          defaultMessage: 'Column "{label}" has no field selected.',
          values: { label: col.label || `#${i + 1}` },
        }));
      }
    });
    return errs;
  }, [localIndexId, localParams.fieldColumns]);

  const handleSave = () => {
    if (errors.length > 0) return;
    onSave({ indexId: localIndexId, params: localParams, filters: localFilters });
    onClose();
  };

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{i18n.translate('formulaTable.editFlyout.documentTitle', { defaultMessage: 'Edit Formula Doc Table' })}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs>
          <EuiTab isSelected={activeTab === 'columns'} onClick={() => setActiveTab('columns')}>
            {i18n.translate('formulaTable.editFlyout.tabColumns', { defaultMessage: 'Columns & Query' })}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'filters'} onClick={() => setActiveTab('filters')}>
            {i18n.translate('formulaTable.editFlyout.tabFilters', { defaultMessage: 'Filters' })}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'display'} onClick={() => setActiveTab('display')}>
            {i18n.translate('formulaTable.editFlyout.tabDisplay', { defaultMessage: 'Display' })}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="m" />

        {activeTab === 'columns' && (
          <>
            <EuiFormRow
              label={i18n.translate('formulaTable.editFlyout.dataView', { defaultMessage: 'Data view' })}
              display="rowCompressed"
            >
              <EuiComboBox
                compressed
                singleSelection={{ asPlainText: true }}
                options={dvOptions}
                selectedOptions={dvOptions.filter((o) => o.value === localIndexId)}
                onChange={(selected) => setLocalIndexId(selected[0]?.value ?? '')}
                isClearable={false}
              />
            </EuiFormRow>
            <EuiSpacer />

            <DocumentTableData
              stateParams={localParams}
              setValue={(key, value) => setLocalParams((prev) => ({ ...prev, [key]: value as any }))}
              setValidity={() => {}}
              dataView={dataView}
            />
          </>
        )}

        {activeTab === 'filters' && (
          <PanelFilterEditor
            filters={localFilters}
            dataView={dataView}
            onChange={setLocalFilters}
          />
        )}

        {activeTab === 'display' && (
          <EnhancedTableOptions
            stateParams={localParams}
            setValue={(key, value) => setLocalParams((prev) => ({ ...prev, [key]: value }))}
            setValidity={() => {}}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {errors.length > 0 && (
          <>
            <EuiCallOut
              color="danger"
              iconType="error"
              size="s"
              title={i18n.translate('formulaTable.editFlyout.validationTitle', { defaultMessage: 'Fix the following before applying:' })}
            >
              <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                {errors.map((msg, idx) => <li key={idx}>{msg}</li>)}
              </ul>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('formulaTable.editFlyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} isDisabled={errors.length > 0}>
              {i18n.translate('formulaTable.editFlyout.apply', { defaultMessage: 'Apply changes' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

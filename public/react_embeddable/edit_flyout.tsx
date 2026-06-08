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

// ─── Enhanced Table ────────────────────────────────────────────────────────────

interface EnhancedFlyoutProps {
  indexId: string | undefined;
  aggConfigs: unknown[];
  schemas: Record<string, number[]>;
  params: EnhancedTableParams;
  onSave: (update: {
    indexId: string;
    aggConfigs: unknown[];
    schemas: Record<string, number[]>;
    params: EnhancedTableParams;
  }) => void;
  onClose: () => void;
}

export const EnhancedTableEditFlyout: React.FC<EnhancedFlyoutProps> = ({
  indexId,
  aggConfigs,
  schemas,
  params,
  onSave,
  onClose,
}) => {
  const [localIndexId, setLocalIndexId] = useState(indexId ?? '');
  const [localAggRows, setLocalAggRows] = useState<AggRow[]>(() =>
    parseAggRowsFromConfig(aggConfigs, schemas)
  );
  const [localParams, setLocalParams] = useState<EnhancedTableParams>({ ...params });
  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [activeTab, setActiveTab] = useState<'query' | 'display'>('query');

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
      errs.push(i18n.translate('enhancedTable2.editFlyout.errorNoDataView', { defaultMessage: 'A data view must be selected.' }));
    }
    localAggRows.forEach((row, i) => {
      if (row.enabled && needsField(row.type) && !row.params.field) {
        errs.push(i18n.translate('enhancedTable2.editFlyout.errorAggNoField', {
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
    });
    onClose();
  };

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{i18n.translate('enhancedTable2.editFlyout.enhancedTitle', { defaultMessage: 'Edit Enhanced Table 2' })}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs>
          <EuiTab isSelected={activeTab === 'query'} onClick={() => setActiveTab('query')}>
            {i18n.translate('enhancedTable2.editFlyout.tabQuery', { defaultMessage: 'Query' })}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'display'} onClick={() => setActiveTab('display')}>
            {i18n.translate('enhancedTable2.editFlyout.tabDisplay', { defaultMessage: 'Display' })}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="m" />

        {activeTab === 'query' && (
          <>
            <EuiFormRow
              label={i18n.translate('enhancedTable2.editFlyout.dataView', { defaultMessage: 'Data view' })}
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
              title={i18n.translate('enhancedTable2.editFlyout.validationTitle', { defaultMessage: 'Fix the following before applying:' })}
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
              {i18n.translate('enhancedTable2.editFlyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} isDisabled={errors.length > 0}>
              {i18n.translate('enhancedTable2.editFlyout.apply', { defaultMessage: 'Apply changes' })}
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
  onSave: (update: { indexId: string; params: DocumentTableParams }) => void;
  onClose: () => void;
}

export const DocumentTableEditFlyout: React.FC<DocumentFlyoutProps> = ({
  indexId,
  params,
  onSave,
  onClose,
}) => {
  const [localIndexId, setLocalIndexId] = useState(indexId ?? '');
  const [localParams, setLocalParams] = useState<DocumentTableParams>({ ...params });
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'columns' | 'display'>('columns');

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
      errs.push(i18n.translate('enhancedTable2.editFlyout.errorNoDataView', { defaultMessage: 'A data view must be selected.' }));
    }
    (localParams.fieldColumns ?? []).forEach((col, i) => {
      if (col.enabled !== false && !col.field?.name) {
        errs.push(i18n.translate('enhancedTable2.editFlyout.errorColumnNoField', {
          defaultMessage: 'Column "{label}" has no field selected.',
          values: { label: col.label || `#${i + 1}` },
        }));
      }
    });
    return errs;
  }, [localIndexId, localParams.fieldColumns]);

  const handleSave = () => {
    if (errors.length > 0) return;
    onSave({ indexId: localIndexId, params: localParams });
    onClose();
  };

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{i18n.translate('enhancedTable2.editFlyout.documentTitle', { defaultMessage: 'Edit Document Table 2' })}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs>
          <EuiTab isSelected={activeTab === 'columns'} onClick={() => setActiveTab('columns')}>
            {i18n.translate('enhancedTable2.editFlyout.tabColumns', { defaultMessage: 'Columns & Query' })}
          </EuiTab>
          <EuiTab isSelected={activeTab === 'display'} onClick={() => setActiveTab('display')}>
            {i18n.translate('enhancedTable2.editFlyout.tabDisplay', { defaultMessage: 'Display' })}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="m" />

        {activeTab === 'columns' && (
          <>
            <EuiFormRow
              label={i18n.translate('enhancedTable2.editFlyout.dataView', { defaultMessage: 'Data view' })}
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
              title={i18n.translate('enhancedTable2.editFlyout.validationTitle', { defaultMessage: 'Fix the following before applying:' })}
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
              {i18n.translate('enhancedTable2.editFlyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} isDisabled={errors.length > 0}>
              {i18n.translate('enhancedTable2.editFlyout.apply', { defaultMessage: 'Apply changes' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

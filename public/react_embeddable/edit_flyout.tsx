import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
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
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EnhancedTableParams, DocumentTableParams } from '../../common/types';
import { EnhancedTableOptions } from '../components/editor/enhanced_table_options';
import { DocumentTableData } from '../components/editor/document_table_data';
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
  const [localAggConfigs, setLocalAggConfigs] = useState(
    JSON.stringify(aggConfigs, null, 2)
  );
  const [localSchemas, setLocalSchemas] = useState(JSON.stringify(schemas, null, 2));
  const [localParams, setLocalParams] = useState<EnhancedTableParams>({ ...params });
  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'query' | 'display'>('query');

  useEffect(() => {
    getDataViewsStart().getIdsWithTitle().then(setDataViewList).catch(() => {});
  }, []);

  const dvOptions: EuiComboBoxOptionOption<string>[] = dataViewList.map((dv) => ({
    label: dv.name ?? dv.title,
    value: dv.id,
  }));

  const handleSave = () => {
    let parsedAggConfigs: unknown[] = [];
    let parsedSchemas: Record<string, number[]> = {};
    try { parsedAggConfigs = JSON.parse(localAggConfigs); } catch {}
    try { parsedSchemas = JSON.parse(localSchemas); } catch {}
    onSave({
      indexId: localIndexId,
      aggConfigs: parsedAggConfigs,
      schemas: parsedSchemas,
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

            <EuiFormRow
              label={i18n.translate('enhancedTable2.editFlyout.aggConfigs', { defaultMessage: 'Aggregation configs (JSON)' })}
              helpText={i18n.translate('enhancedTable2.editFlyout.aggConfigsHelp', { defaultMessage: 'Array of Kibana aggregation config objects' })}
            >
              <EuiTextArea
                rows={8}
                value={localAggConfigs}
                onChange={(e) => setLocalAggConfigs(e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />

            <EuiFormRow
              label={i18n.translate('enhancedTable2.editFlyout.schemas', { defaultMessage: 'Schemas (JSON)' })}
              helpText={i18n.translate('enhancedTable2.editFlyout.schemasHelp', { defaultMessage: 'Maps schema names to column indices, e.g. {"metric":[0],"bucket":[1]}' })}
            >
              <EuiTextArea
                rows={3}
                value={localSchemas}
                onChange={(e) => setLocalSchemas(e.target.value)}
              />
            </EuiFormRow>
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
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('enhancedTable2.editFlyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave}>
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

  const handleSave = () => {
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
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('enhancedTable2.editFlyout.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave}>
              {i18n.translate('enhancedTable2.editFlyout.apply', { defaultMessage: 'Apply changes' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

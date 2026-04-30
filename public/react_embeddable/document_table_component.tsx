import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { get } from 'lodash';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import {
  useFetchContext,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { getTime } from '@kbn/data-plugin/common';
import { DocumentTable } from '../components/table/document_table';
import { documentTableResponseHandler } from '../data_load/response_handler';
import { getDataViewsStart, getSearchService, getUiActions } from '../services';
import { DocumentTableEditFlyout } from './edit_flyout';
import type { DocumentTableApi, DocumentTableSerializedState } from './types';
import type { DocumentTableParams, VisRenderData, TableEvent } from '../../common/types';

const MAX_HITS_SIZE = 10000;

interface Props {
  api: DocumentTableApi;
  indexId$: BehaviorSubject<string | undefined>;
  params$: BehaviorSubject<DocumentTableParams>;
  isEditing$: BehaviorSubject<boolean>;
  onUpdateState: (update: Partial<Omit<DocumentTableSerializedState, 'title'>>) => void;
}

export const DocumentTableEmbeddableComponent: React.FC<Props> = ({
  api,
  indexId$,
  params$,
  isEditing$,
  onUpdateState,
}) => {
  const fetchContext = useFetchContext(api);
  const indexId = useStateFromPublishingSubject(indexId$);
  const params = useStateFromPublishingSubject(params$);
  const isEditing = useStateFromPublishingSubject(isEditing$);

  const [visData, setVisData] = useState<VisRenderData>({ tables: [], totalHits: 0 });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!indexId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const dataView = await getDataViewsStart().get(indexId);
        const { fieldColumns = [], hitsSize = 10, sortField, sortOrder = 'desc' } = params;
        const resolvedHitsSize = Math.min(hitsSize, MAX_HITS_SIZE);

        const searchSourceFields: Record<string, unknown> = { size: resolvedHitsSize };
        const enabledCols = fieldColumns.filter((fc) => fc.enabled !== false);

        const hasSourceField = enabledCols.some((fc) => fc.field?.name === '_source');
        if (!hasSourceField) {
          searchSourceFields._source = enabledCols
            .map((fc) => fc.field?.name)
            .filter(Boolean);
        }

        const docvalueFields = enabledCols
          .filter((fc) => !fc.field?.name?.startsWith('_') && fc.field?.aggregatable)
          .map((fc) => fc.field.name);
        if (docvalueFields.length > 0) searchSourceFields.docvalue_fields = docvalueFields;

        const scriptFields: Record<string, any> = {};
        enabledCols
          .filter((fc) => fc.field?.scripted)
          .forEach((fc) => {
            scriptFields[fc.field.name] = { script: { source: fc.field.script } };
          });
        if (Object.keys(scriptFields).length > 0) {
          searchSourceFields.script_fields = scriptFields;
        }

        if (sortField?.name) {
          searchSourceFields.sort = [{ [sortField.name]: { order: sortOrder } }];
        }

        const searchSource = await getSearchService().searchSource.create();
        searchSource.setField('index', dataView);
        Object.keys(searchSourceFields).forEach((k) => {
          searchSource.setField(k as any, searchSourceFields[k] as any);
        });

        const timeRangeFilter = fetchContext.timeRange
          ? getTime(dataView ?? undefined, fetchContext.timeRange)
          : null;
        const allFilters = [
          ...(fetchContext.filters ?? []),
          ...(timeRangeFilter ? [timeRangeFilter] : []),
        ];
        if (allFilters.length > 0) searchSource.setField('filter', allFilters as any);
        if (fetchContext.query) searchSource.setField('query', fetchContext.query as any);

        const { rawResponse } = await lastValueFrom(
          searchSource.fetch$({ abortSignal: controller.signal, sessionId: fetchContext.searchSessionId })
        );

        if (controller.signal.aborted) return;

        const response = {
          hits: get(rawResponse, 'hits.hits', []) as any[],
          totalHits: get(rawResponse, 'hits.total', 0) as number,
          fieldColumns: enabledCols,
          aggs: null,
          indexPatternId: dataView.id,
        };

        setVisData(documentTableResponseHandler(response));
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setLoadError(err?.message ?? 'Search failed');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexId, params.fieldColumns, params.hitsSize, params.sortField, params.sortOrder,
      fetchContext.filters, fetchContext.query, fetchContext.searchSessionId, fetchContext.timeRange]);

  const fireEvent = useCallback(
    async (event: TableEvent) => {
      const triggerId =
        event.name === 'tableRowContextMenuClick' ? ROW_CLICK_TRIGGER : VALUE_CLICK_TRIGGER;
      try {
        await getUiActions().executeTriggerActions(triggerId, { embeddable: api, data: event.data });
      } catch {}
    },
    [api]
  );

  const hasCompatibleActions = useCallback(
    async (event: TableEvent) => {
      const triggerId =
        event.name === 'tableRowContextMenuClick' ? ROW_CLICK_TRIGGER : VALUE_CLICK_TRIGGER;
      try {
        const actions = await getUiActions().getTriggerCompatibleActions(triggerId, {
          embeddable: api,
          data: event.data,
        });
        return actions.length > 0;
      } catch {
        return false;
      }
    },
    [api]
  );

  return (
    <>
      {loading && <EuiLoadingSpinner size="m" />}
      {loadError && (
        <EuiCallOut title="Error loading data" color="danger" iconType="alert">
          {loadError}
        </EuiCallOut>
      )}
      {!loadError && (
        <DocumentTable
          visData={visData}
          visParams={params}
          fireEvent={fireEvent}
          hasCompatibleActions={hasCompatibleActions}
        />
      )}
      {isEditing && (
        <DocumentTableEditFlyout
          indexId={indexId}
          params={params}
          onSave={(update) => onUpdateState({ indexId: update.indexId, params: update.params })}
          onClose={() => isEditing$.next(false)}
        />
      )}
    </>
  );
};

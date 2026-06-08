import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import {
  useFetchContext,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { EnhancedTable } from '../components/table/enhanced_table';
import { handleRequest } from '../data_load/request_handler';
import { enhancedTableResponseHandler } from '../data_load/response_handler';
import { getDataViewsStart, getSearchService, getUiActions } from '../services';
import { EnhancedTableEditFlyout } from './edit_flyout';
import type { EnhancedTableApi, EnhancedTableSerializedState } from './types';
import type { EnhancedTableParams, VisRenderData, TableEvent } from '../../common/types';

interface Props {
  api: EnhancedTableApi;
  indexId$: BehaviorSubject<string | undefined>;
  aggConfigs$: BehaviorSubject<unknown[]>;
  schemas$: BehaviorSubject<Record<string, number[]>>;
  params$: BehaviorSubject<EnhancedTableParams>;
  isEditing$: BehaviorSubject<boolean>;
  onUpdateState: (update: Partial<Omit<EnhancedTableSerializedState, 'title'>>) => void;
}

export const EnhancedTableEmbeddableComponent: React.FC<Props> = ({
  api,
  indexId$,
  aggConfigs$,
  schemas$,
  params$,
  isEditing$,
  onUpdateState,
}) => {
  const fetchContext = useFetchContext(api);
  const indexId = useStateFromPublishingSubject(indexId$);
  const aggConfigs = useStateFromPublishingSubject(aggConfigs$);
  const schemas = useStateFromPublishingSubject(schemas$);
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
        const searchService = getSearchService();

        const aggConfigsArr = ((aggConfigs ?? []) as any[]).slice();
        if (aggConfigsArr.length === 0) {
          aggConfigsArr.push({ id: '1', enabled: true, type: 'count', schema: 'metric', params: {} });
        }

        const aggs = searchService.aggs.createAggConfigs(dataView, aggConfigsArr, {
          hierarchical: params.showMetricsAtAllLevels,
        });

        const response: any = await lastValueFrom(
          handleRequest({
            abortSignal: controller.signal,
            aggs,
            filters: fetchContext.filters,
            indexPattern: dataView,
            inspectorAdapters: {} as any,
            partialRows: params.showPartialRows,
            query: fetchContext.query as any,
            searchSessionId: fetchContext.searchSessionId,
            searchSourceService: searchService.searchSource,
            timeRange: fetchContext.timeRange,
            executionContext: undefined,
            searchSourceFields: { size: 0 },
          })
        );

        if (controller.signal.aborted) return;

        if (response?.columns) {
          response.columns.forEach((column: any) => {
            if (column.meta?.sourceParams?.id) {
              const aggId = column.meta.sourceParams.id.split('.')[0];
              column.aggConfig = aggs.byId(aggId);
            }
            // Backfill index/indexPatternId so VALUE_CLICK_TRIGGER filter action
            // can always build an ES filter (mirrors documentTableResponseHandler).
            if (column.meta) {
              if (!column.meta.index) column.meta.index = dataView.id;
              if (column.meta.sourceParams && !column.meta.sourceParams.indexPatternId) {
                column.meta.sourceParams.indexPatternId = dataView.id;
              }
            }
          });
          if (schemas) {
            Object.keys(schemas).forEach((schemaName) => {
              (schemas[schemaName] as number[]).forEach((colIndex) => {
                const col = response.columns[colIndex];
                if (col?.aggConfig) col.aggConfig.schema = schemaName;
              });
            });
          }
        }

        setVisData(enhancedTableResponseHandler(response));
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
  }, [indexId, aggConfigs, schemas, params.showPartialRows, params.showMetricsAtAllLevels,
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
        <EnhancedTable
          visData={visData}
          visParams={params}
          fireEvent={fireEvent}
          hasCompatibleActions={hasCompatibleActions}
        />
      )}
      {isEditing && (
        <EnhancedTableEditFlyout
          indexId={indexId}
          aggConfigs={aggConfigs ?? []}
          schemas={schemas ?? {}}
          params={params}
          onSave={(update) => {
            onUpdateState({
              indexId: update.indexId,
              aggConfigs: update.aggConfigs,
              schemas: update.schemas,
              params: update.params,
            });
          }}
          onClose={() => isEditing$.next(false)}
        />
      )}
    </>
  );
};

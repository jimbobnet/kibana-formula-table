import { i18n } from '@kbn/i18n';
import { defer, map, switchMap } from 'rxjs';
import { get } from 'lodash';

import type { Filter, TimeRange } from '@kbn/es-query';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Adapters } from '@kbn/inspector-plugin/common';
import {
  calculateBounds,
  type DataView,
  type Query,
  type IAggConfigs,
  type ISearchStartSearchSource,
  tabifyAggResponse,
} from '@kbn/data-plugin/common';

export interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  aggs: IAggConfigs;
  filters?: Filter[];
  indexPattern?: DataView;
  inspectorAdapters: Adapters;
  partialRows?: boolean;
  query?: Query;
  searchSessionId?: string;
  searchSourceService: ISearchStartSearchSource;
  timeFields?: string[];
  timeRange?: TimeRange;
  executionContext?: KibanaExecutionContext;
  searchSourceFields: Record<string, unknown>;
}

export const handleRequest = ({
  abortSignal,
  aggs,
  filters,
  indexPattern,
  inspectorAdapters,
  partialRows,
  query,
  searchSessionId,
  searchSourceService,
  timeFields,
  timeRange,
  executionContext,
  searchSourceFields,
}: RequestHandlerParams) => {
  return defer(async () => {
    const searchSource = await searchSourceService.create();
    searchSource.setField('index', indexPattern);
    Object.keys(searchSourceFields).forEach((fieldName) => {
      searchSource.setField(fieldName as any, searchSourceFields[fieldName] as any);
    });

    const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
    const requestSearchSource = timeFilterSearchSource.createChild({
      callParentStartHandlers: true,
    });

    const defaultTimeField = indexPattern?.getTimeField?.();
    const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
    const allTimeFields = timeFields?.length ? timeFields : defaultTimeFields;

    if (timeRange) aggs.setTimeRange(timeRange);
    aggs.setTimeFields(allTimeFields);

    Object.defineProperty(requestSearchSource, 'history', {
      get() {
        return searchSource.history;
      },
      set(history) {
        return (searchSource.history = history);
      },
    });

    requestSearchSource.setField('aggs', aggs);
    requestSearchSource.onRequestStart((paramSearchSource, options) => {
      return aggs.onSearchRequestStart(paramSearchSource, options);
    });

    if (timeRange && allTimeFields.length > 0) {
      timeFilterSearchSource.setField('filter', () => {
        return aggs.getSearchSourceTimeFilter();
      });
    }

    requestSearchSource.setField('filter', filters);
    requestSearchSource.setField('query', query);

    return { allTimeFields, requestSearchSource };
  }).pipe(
    switchMap(({ allTimeFields, requestSearchSource }) =>
      requestSearchSource
        .fetch$({
          abortSignal,
          sessionId: searchSessionId,
          inspector: {
            adapter: inspectorAdapters.requests,
            title: i18n.translate('enhancedTable2.dataRequest.title', {
              defaultMessage: 'Data',
            }),
            description: i18n.translate('enhancedTable2.dataRequest.description', {
              defaultMessage: 'Queries Elasticsearch to fetch visualization data.',
            }),
          },
          executionContext,
        })
        .pipe(
          map(({ rawResponse: response }) => {
            const parsedTimeRange = timeRange ? calculateBounds(timeRange, {}) : null;
            const tabifyParams = {
              metricsAtAllLevels: aggs.hierarchical,
              partialRows,
              timeRange: parsedTimeRange
                ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
                : undefined,
            };

            return {
              ...tabifyAggResponse(aggs, response, tabifyParams),
              totalHits: get(response, 'hits.total', -1) as number,
              hits: get(response, 'hits.hits', []) as any[],
            };
          })
        )
    )
  );
};

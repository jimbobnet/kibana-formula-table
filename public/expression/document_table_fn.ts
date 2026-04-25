import { get } from 'lodash';
import { lastValueFrom } from 'rxjs';
import type { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import { getTime } from '@kbn/data-plugin/common';
import { getDataViewsStart, getSearchService } from '../services';
import { documentTableResponseHandler } from '../data_load/response_handler';
import type { VisRenderData } from '../../common/types';
import { DOC_TABLE_VIS_NAME, RENDERER_NAME } from '../../common';

interface Arguments {
  index?: string | null;
  visConfig?: string;
  uiState?: string;
  aggConfigs?: string;
  schemas?: string;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
}

export interface DocumentTableRenderValue {
  visType: string;
  visData: VisRenderData;
  visConfig: object;
}

export type DocumentTableExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof DOC_TABLE_VIS_NAME,
  any,
  Arguments,
  Promise<Render<DocumentTableRenderValue>>
>;

const MAX_HITS_SIZE = 10000;

export const getDocumentTableExpressionFn = (): DocumentTableExpressionFunctionDefinition => ({
  name: DOC_TABLE_VIS_NAME,
  type: 'render',
  help: 'Document Table 2 visualization expression function',
  args: {
    index: { types: ['string'], default: '', help: 'Data view ID' },
    visConfig: { types: ['string'], default: '"{}"', help: 'Visualization config JSON' },
    uiState: { types: ['string'], default: '"{}"', help: 'UI state JSON' },
    aggConfigs: { types: ['string'], default: '"{}"', help: 'Aggregation configs JSON' },
    schemas: { types: ['string'], default: '"{}"', help: 'Schemas JSON' },
    metricsAtAllLevels: { types: ['boolean'], default: false, help: 'Unused (document table)' },
    partialRows: { types: ['boolean'], default: false, help: 'Unused (document table)' },
  },
  async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, getExecutionContext }) {
    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const dataView = args.index ? await getDataViewsStart().get(args.index) : null;

    if (!dataView) {
      return {
        type: 'render' as const,
        as: RENDERER_NAME,
        value: { visType: DOC_TABLE_VIS_NAME, visData: { tables: [], totalHits: 0 }, visConfig: visConfigParams },
      };
    }

    const { fieldColumns = [], hitsSize = 10, sortField, sortOrder = 'desc' } = visConfigParams;
    const resolvedHitsSize = Math.min(hitsSize, MAX_HITS_SIZE);

    const searchSourceFields: Record<string, unknown> = { size: resolvedHitsSize };

    const enabledCols = (fieldColumns as any[]).filter((fc: any) => fc.enabled !== false);
    const hasSourceField = enabledCols.some((fc: any) => fc.field?.name === '_source');
    if (!hasSourceField) {
      searchSourceFields._source = enabledCols.map((fc: any) => fc.field?.name).filter(Boolean);
    }

    const docvalueFields = enabledCols
      .filter((fc: any) => !fc.field?.name?.startsWith('_') && fc.field?.aggregatable)
      .map((fc: any) => fc.field.name);
    if (docvalueFields.length > 0) {
      searchSourceFields.docvalue_fields = docvalueFields;
    }

    const scriptFields: Record<string, any> = {};
    enabledCols
      .filter((fc: any) => fc.field?.scripted)
      .forEach((fc: any) => {
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

    const filters = get(input, 'filters', []) as any[];
    const query = get(input, 'query', null) as any;
    const timeRange = get(input, 'timeRange', null) as any;

    const timeRangeFilter = timeRange ? getTime(dataView ?? undefined, timeRange) : null;
    const allFilters = timeRangeFilter ? [...filters, timeRangeFilter] : filters;
    if (allFilters.length > 0) searchSource.setField('filter', allFilters);
    if (query) searchSource.setField('query', query);

    const fetchOptions: any = {
      abortSignal,
      sessionId: getSearchSessionId(),
      executionContext: getExecutionContext(),
    };
    if (inspectorAdapters?.requests) {
      fetchOptions.inspector = { adapter: inspectorAdapters.requests };
    }
    const { rawResponse } = await lastValueFrom(searchSource.fetch$(fetchOptions));

    const response = {
      hits: get(rawResponse, 'hits.hits', []) as any[],
      totalHits: get(rawResponse, 'hits.total', 0),
      fieldColumns: enabledCols,
      aggs: null,
      indexPatternId: dataView.id,
    };

    const visData = documentTableResponseHandler(response);

    return {
      type: 'render' as const,
      as: RENDERER_NAME,
      value: { visType: DOC_TABLE_VIS_NAME, visData, visConfig: visConfigParams },
    };
  },
});

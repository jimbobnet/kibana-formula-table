import { get } from 'lodash';
import { lastValueFrom } from 'rxjs';
import type { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import { getDataViewsStart, getSearchService } from '../services';
import { handleRequest } from '../data_load/request_handler';
import { enhancedTableResponseHandler } from '../data_load/response_handler';
import type { VisRenderData } from '../../common/types';
import { ENH_TABLE_VIS_NAME, RENDERER_NAME } from '../../common';

interface Arguments {
  index?: string | null;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  schemas?: string;
  visConfig?: string;
  uiState?: string;
  aggConfigs?: string;
}

export interface EnhancedTableRenderValue {
  visType: string;
  visData: VisRenderData;
  visConfig: object;
}

export type EnhancedTableExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof ENH_TABLE_VIS_NAME,
  any,
  Arguments,
  Promise<Render<EnhancedTableRenderValue>>
>;

export const getEnhancedTableExpressionFn = (): EnhancedTableExpressionFunctionDefinition => ({
  name: ENH_TABLE_VIS_NAME,
  type: 'render',
  help: 'Enhanced Table 2 visualization expression function',
  args: {
    index: { types: ['string'], default: '', help: 'Data view ID' },
    metricsAtAllLevels: { types: ['boolean'], default: false, help: 'Show metrics at all levels' },
    partialRows: { types: ['boolean'], default: false, help: 'Show partial rows' },
    schemas: { types: ['string'], default: '"{}"', help: 'Schemas JSON' },
    visConfig: { types: ['string'], default: '"{}"', help: 'Visualization config JSON' },
    uiState: { types: ['string'], default: '"{}"', help: 'UI state JSON' },
    aggConfigs: { types: ['string'], default: '"{}"', help: 'Aggregation configs JSON' },
  },
  async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, getExecutionContext }) {
    const visConfigParams = args.visConfig ? JSON.parse(args.visConfig) : {};
    const schemas = args.schemas ? JSON.parse(args.schemas) : {};
    const dataView = args.index ? await getDataViewsStart().get(args.index) : null;

    const aggConfigsState = args.aggConfigs ? JSON.parse(args.aggConfigs) : [];
    const aggs = dataView
      ? getSearchService().aggs.createAggConfigs(dataView, aggConfigsState, {
          hierarchical: args.metricsAtAllLevels,
        })
      : undefined;

    if (!aggs || !dataView) {
      return {
        type: 'render' as const,
        as: RENDERER_NAME,
        value: { visType: ENH_TABLE_VIS_NAME, visData: { tables: [], totalHits: 0 }, visConfig: visConfigParams },
      };
    }

    if (aggs.aggs.length === 0) {
      aggs.createAggConfig({ id: '1', enabled: true, type: 'count', schema: 'metric', params: {} });
    }

    let response = await lastValueFrom(
      handleRequest({
        abortSignal,
        aggs,
        filters: get(input, 'filters', null) ?? undefined,
        indexPattern: dataView,
        inspectorAdapters,
        partialRows: args.partialRows,
        query: get(input, 'query', null) ?? undefined,
        searchSessionId: getSearchSessionId(),
        searchSourceService: getSearchService().searchSource,
        timeRange: get(input, 'timeRange', null) ?? undefined,
        executionContext: getExecutionContext(),
        searchSourceFields: { size: 0 },
      })
    );

    response = response as any;

    if ((response as any).columns) {
      (response as any).columns.forEach((column: any) => {
        if (column.meta?.sourceParams?.id) {
          const aggId = column.meta.sourceParams.id.split('.')[0];
          column.aggConfig = aggs.byId(aggId);
        }
      });

      Object.keys(schemas).forEach((schemaName) => {
        (schemas[schemaName] as number[]).forEach((colIndex) => {
          const col = (response as any).columns[colIndex];
          if (col?.aggConfig) {
            col.aggConfig.schema = schemaName;
          }
        });
      });

      if (inspectorAdapters?.tables) {
        inspectorAdapters.tables.logDatatable('default', response as any);
      }
    }

    const visData = enhancedTableResponseHandler(response);

    return {
      type: 'render' as const,
      as: RENDERER_NAME,
      value: { visType: ENH_TABLE_VIS_NAME, visData, visConfig: visConfigParams },
    };
  },
});

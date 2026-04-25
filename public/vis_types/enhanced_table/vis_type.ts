import { i18n } from '@kbn/i18n';
import { AggGroupNames } from '@kbn/data-plugin/public';
import { VIS_EVENT_TO_TRIGGER, VisGroups } from '@kbn/visualizations-plugin/public';
import type { VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import type { EnhancedTableParams } from '../../../common/types';
import { ENH_TABLE_VIS_NAME } from '../../../common';
import { ENHANCED_TABLE_DEFAULT_PARAMS } from './default_params';
import { enhancedTableToExpressionAst } from './to_ast';
import { EnhancedTableOptions } from '../../components/editor/enhanced_table_options';

export const getEnhancedTableVisType = (): VisTypeDefinition<EnhancedTableParams> => ({
  name: ENH_TABLE_VIS_NAME,
  title: i18n.translate('enhancedTable2.visTypeEnhancedTable.visTitle', {
    defaultMessage: 'Enhanced Table 2',
  }),
  icon: 'visTable',
  description: i18n.translate('enhancedTable2.visTypeEnhancedTable.visDescription', {
    defaultMessage:
      'Aggregation-based data table with computed columns, column totals, and row click actions.',
  }),
  toExpressionAst: enhancedTableToExpressionAst,
  getSupportedTriggers: () => [
    VIS_EVENT_TO_TRIGGER.filter,
    VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick,
  ],
  visConfig: {
    defaults: ENHANCED_TABLE_DEFAULT_PARAMS,
  },
  editorConfig: {
    enableDataViewChange: true,
    optionsTemplate: EnhancedTableOptions,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('enhancedTable2.schemas.metricTitle', {
          defaultMessage: 'Metric',
        }),
        aggFilter: ['!geo_centroid', '!geo_bounds'],
        aggSettings: { top_hits: { allowStrings: true } },
        min: 1,
        defaults: [{ type: 'count', schema: 'metric' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('enhancedTable2.schemas.splitTitle', {
          defaultMessage: 'Split table',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'bucket',
        title: i18n.translate('enhancedTable2.schemas.bucketTitle', {
          defaultMessage: 'Split rows',
        }),
        aggFilter: ['!filter'],
      },
    ],
  },
  requiresSearch: true,
  group: VisGroups.PROMOTED,
  hasPartialRows: (vis) => vis.params.showPartialRows,
  hierarchicalData: (vis) =>
    Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels),
});

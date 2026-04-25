import {
  buildExpression,
  buildExpressionFunction,
  type ExpressionAstExpression,
} from '@kbn/expressions-plugin/public';
import { getVisSchemas, type VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import type { EnhancedTableParams } from '../../../common/types';
import { ENH_TABLE_VIS_NAME } from '../../../common';
import type { EnhancedTableExpressionFunctionDefinition } from '../../expression/enhanced_table_fn';

export const enhancedTableToExpressionAst: VisToExpressionAst<EnhancedTableParams> = (
  vis,
  params
): ExpressionAstExpression => {
  const schemas = getVisSchemas(vis, params);

  const visConfig = {
    ...vis.params,
    title: vis.title,
  };

  const fn = buildExpressionFunction<EnhancedTableExpressionFunctionDefinition>(
    ENH_TABLE_VIS_NAME,
    {
      visConfig: JSON.stringify(visConfig),
      schemas: JSON.stringify(schemas),
      index: vis.data.indexPattern!.id!,
      uiState: JSON.stringify(vis.uiState),
      aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
      partialRows: vis.params.showPartialRows,
      metricsAtAllLevels: vis.isHierarchical(),
    }
  );

  return buildExpression([fn]).toAst();
};

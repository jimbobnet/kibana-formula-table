import {
  buildExpression,
  buildExpressionFunction,
  type ExpressionAstExpression,
} from '@kbn/expressions-plugin/public';
import { getVisSchemas, type VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import type { DocumentTableParams } from '../../../common/types';
import { DOC_TABLE_VIS_NAME } from '../../../common';
import type { DocumentTableExpressionFunctionDefinition } from '../../expression/document_table_fn';

export const documentTableToExpressionAst: VisToExpressionAst<DocumentTableParams> = (
  vis,
  params
): ExpressionAstExpression => {
  const schemas = getVisSchemas(vis, params);

  const visConfig = {
    ...vis.params,
    title: vis.title,
  };

  const fn = buildExpressionFunction<DocumentTableExpressionFunctionDefinition>(
    DOC_TABLE_VIS_NAME,
    {
      visConfig: JSON.stringify(visConfig),
      schemas: JSON.stringify(schemas),
      index: vis.data.indexPattern!.id!,
      uiState: JSON.stringify(vis.uiState),
      aggConfigs: JSON.stringify(vis.data.aggs?.aggs ?? []),
      partialRows: false,
      metricsAtAllLevels: false,
    }
  );

  return buildExpression([fn]).toAst();
};

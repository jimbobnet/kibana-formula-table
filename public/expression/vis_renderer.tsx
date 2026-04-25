import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';
import { EnhancedTable } from '../components/table/enhanced_table';
import { DocumentTable } from '../components/table/document_table';
import type { EnhancedTableRenderValue } from './enhanced_table_fn';
import type { DocumentTableRenderValue } from './document_table_fn';
import { DOC_TABLE_VIS_NAME, RENDERER_NAME } from '../../common';

type AnyRenderValue = EnhancedTableRenderValue | DocumentTableRenderValue;

export const getEnhancedTable2Renderer = (
  core: CoreStart
): ExpressionRenderDefinition<AnyRenderValue> => ({
  name: RENDERER_NAME,
  displayName: 'Enhanced Table 2',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    const { visType, visData, visConfig } = config;
    const isDocTable = visType === DOC_TABLE_VIS_NAME;

    const element = isDocTable ? (
      <DocumentTable
        visData={visData as any}
        visParams={visConfig as any}
        fireEvent={handlers.event}
        hasCompatibleActions={handlers.hasCompatibleActions}
      />
    ) : (
      <EnhancedTable
        visData={visData as any}
        visParams={visConfig as any}
        fireEvent={handlers.event}
        hasCompatibleActions={handlers.hasCompatibleActions}
      />
    );

    ReactDOM.render(
      <KibanaRenderContextProvider {...core}>{element}</KibanaRenderContextProvider>,
      domNode,
      () => handlers.done()
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

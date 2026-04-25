import { i18n } from '@kbn/i18n';
import { VIS_EVENT_TO_TRIGGER, VisGroups } from '@kbn/visualizations-plugin/public';
import type { VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import type { DocumentTableParams } from '../../../common/types';
import { DOC_TABLE_VIS_NAME } from '../../../common';
import { DOCUMENT_TABLE_DEFAULT_PARAMS } from './default_params';
import { documentTableToExpressionAst } from './to_ast';
import { DocumentTableData } from '../../components/editor/document_table_data';
import { EnhancedTableOptions } from '../../components/editor/enhanced_table_options';

export const getDocumentTableVisType = (): VisTypeDefinition<DocumentTableParams> => ({
  name: DOC_TABLE_VIS_NAME,
  title: i18n.translate('enhancedTable2.visTypeDocumentTable.visTitle', {
    defaultMessage: 'Document Table 2',
  }),
  icon: 'visTable',
  description: i18n.translate('enhancedTable2.visTypeDocumentTable.visDescription', {
    defaultMessage:
      'Document (hit) based table with configurable field columns and row click actions.',
  }),
  toExpressionAst: documentTableToExpressionAst,
  getSupportedTriggers: () => [
    VIS_EVENT_TO_TRIGGER.filter,
    VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick,
  ],
  visConfig: {
    defaults: DOCUMENT_TABLE_DEFAULT_PARAMS,
  },
  editorConfig: {
    enableDataViewChange: true,
    optionTabs: [
      {
        name: 'fieldColumns',
        title: i18n.translate('enhancedTable2.tabs.dataLabel', { defaultMessage: 'Data' }),
        editor: DocumentTableData,
      },
      {
        name: 'options',
        title: i18n.translate('enhancedTable2.tabs.optionsLabel', { defaultMessage: 'Options' }),
        editor: EnhancedTableOptions,
      },
    ],
  },
  requiresSearch: true,
  group: VisGroups.PROMOTED,
  hasPartialRows: () => false,
  hierarchicalData: () => false,
});

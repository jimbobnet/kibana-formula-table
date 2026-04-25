import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SetupDependencies, StartDependencies, EnhancedTable2PluginSetup, EnhancedTable2PluginStart } from './types';
import {
  setFormatService,
  setNotifications,
  setSearchService,
  setDataViewsStart,
  setVisualization,
  setThemeService,
} from './services';
import { getEnhancedTableExpressionFn } from './expression/enhanced_table_fn';
import { getDocumentTableExpressionFn } from './expression/document_table_fn';
import { getEnhancedTable2Renderer } from './expression/vis_renderer';
import { getEnhancedTableVisType } from './vis_types/enhanced_table/vis_type';
import { getDocumentTableVisType } from './vis_types/document_table/vis_type';

export class EnhancedTable2Plugin
  implements Plugin<EnhancedTable2PluginSetup, EnhancedTable2PluginStart, SetupDependencies, StartDependencies>
{
  public setup(
    core: CoreSetup<StartDependencies>,
    { expressions, visualizations }: SetupDependencies
  ): EnhancedTable2PluginSetup {
    expressions.registerFunction(getEnhancedTableExpressionFn());
    expressions.registerFunction(getDocumentTableExpressionFn());

    core.getStartServices().then(([coreStart]) => {
      expressions.registerRenderer(getEnhancedTable2Renderer(coreStart));
    });

    visualizations.createBaseVisualization(getEnhancedTableVisType());
    visualizations.createBaseVisualization(getDocumentTableVisType());

    return {};
  }

  public start(core: CoreStart, deps: StartDependencies): EnhancedTable2PluginStart {
    setFormatService(deps.fieldFormats);
    setNotifications(core.notifications);
    setSearchService(deps.data.search);
    setDataViewsStart(deps.dataViews);
    setVisualization(deps.visualizations);
    setThemeService(core.theme);

    return {};
  }

  public stop() {}
}

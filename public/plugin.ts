import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type {
  SetupDependencies,
  StartDependencies,
  EnhancedTable2PluginSetup,
  EnhancedTable2PluginStart,
} from './types';
import {
  setFormatService,
  setNotifications,
  setSearchService,
  setDataViewsStart,
  setThemeService,
  setUiActions,
  setEmbeddableEnhanced,
  setSavedObjectsClient,
} from './services';
import {
  ENHANCED_TABLE_EMBEDDABLE_TYPE,
  createEnhancedTableEmbeddableFactory,
} from './react_embeddable/enhanced_table_embeddable';
import {
  DOCUMENT_TABLE_EMBEDDABLE_TYPE,
  createDocumentTableEmbeddableFactory,
} from './react_embeddable/document_table_embeddable';

const ADD_ENHANCED_TABLE_ACTION_ID = 'addEnhancedTable2PanelAction';
const ADD_DOCUMENT_TABLE_ACTION_ID = 'addDocumentTable2PanelAction';

export class EnhancedTable2Plugin
  implements Plugin<EnhancedTable2PluginSetup, EnhancedTable2PluginStart, SetupDependencies, StartDependencies>
{
  public setup(
    _core: CoreSetup<StartDependencies>,
    { embeddable }: SetupDependencies
  ): EnhancedTable2PluginSetup {
    embeddable.registerReactEmbeddableFactory(ENHANCED_TABLE_EMBEDDABLE_TYPE, async () =>
      createEnhancedTableEmbeddableFactory()
    );
    embeddable.registerReactEmbeddableFactory(DOCUMENT_TABLE_EMBEDDABLE_TYPE, async () =>
      createDocumentTableEmbeddableFactory()
    );

    return {};
  }

  public start(_core: CoreStart, deps: StartDependencies): EnhancedTable2PluginStart {
    setFormatService(deps.fieldFormats);
    setNotifications(_core.notifications);
    setSearchService(deps.data.search);
    setDataViewsStart(deps.dataViews);
    setThemeService(_core.theme);
    setUiActions(deps.uiActions);
    setEmbeddableEnhanced(deps.embeddableEnhanced);
    setSavedObjectsClient(_core.savedObjects.client);

    // Register "Add panel" actions so both embeddable types appear in the dashboard Add panel menu.
    deps.uiActions.registerAction<EmbeddableApiContext>({
      id: ADD_ENHANCED_TABLE_ACTION_ID,
      getDisplayName: () => 'Enhanced Table 2',
      getIconType: () => 'visTable',
      isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
      execute: async ({ embeddable }) => {
        if (!apiCanAddNewPanel(embeddable)) return;
        embeddable.addNewPanel({ panelType: ENHANCED_TABLE_EMBEDDABLE_TYPE }, true);
      },
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_ENHANCED_TABLE_ACTION_ID);

    deps.uiActions.registerAction<EmbeddableApiContext>({
      id: ADD_DOCUMENT_TABLE_ACTION_ID,
      getDisplayName: () => 'Document Table 2',
      getIconType: () => 'visTable',
      isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
      execute: async ({ embeddable }) => {
        if (!apiCanAddNewPanel(embeddable)) return;
        embeddable.addNewPanel({ panelType: DOCUMENT_TABLE_EMBEDDABLE_TYPE }, true);
      },
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_DOCUMENT_TABLE_ACTION_ID);

    return {};
  }

  public stop() {}
}

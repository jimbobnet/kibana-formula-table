import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { SAVED_OBJECT_TYPE, PLUGIN_ID } from '../common';
import type {
  SetupDependencies,
  StartDependencies,
  FormulaTablePluginSetup,
  FormulaTablePluginStart,
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
  FORMULA_TABLE_EMBEDDABLE_TYPE,
  createEnhancedTableEmbeddableFactory,
} from './react_embeddable/formula_table_embeddable';
import {
  FORMULA_DOC_TABLE_EMBEDDABLE_TYPE,
  createDocumentTableEmbeddableFactory,
} from './react_embeddable/formula_doc_table_embeddable';

const ADD_ENHANCED_TABLE_ACTION_ID = 'addFormulaTablePanelAction';
const ADD_DOCUMENT_TABLE_ACTION_ID = 'addFormulaDocTablePanelAction';

export class FormulaTablePlugin
  implements Plugin<FormulaTablePluginSetup, FormulaTablePluginStart, SetupDependencies, StartDependencies>
{
  public setup(
    _core: CoreSetup<StartDependencies>,
    { embeddable, contentManagement }: SetupDependencies
  ): FormulaTablePluginSetup {
    contentManagement.registry.register({
      id: SAVED_OBJECT_TYPE,
      version: { latest: 1 },
      name: PLUGIN_ID,
    });

    embeddable.registerReactEmbeddableFactory(FORMULA_TABLE_EMBEDDABLE_TYPE, async () =>
      createEnhancedTableEmbeddableFactory()
    );
    embeddable.registerReactEmbeddableFactory(FORMULA_DOC_TABLE_EMBEDDABLE_TYPE, async () =>
      createDocumentTableEmbeddableFactory()
    );

    embeddable.registerAddFromLibraryType({
      onAdd: (container, savedObject) => {
        const attrs = savedObject.attributes as { subType?: string };
        const panelType =
          attrs.subType === FORMULA_DOC_TABLE_EMBEDDABLE_TYPE
            ? FORMULA_DOC_TABLE_EMBEDDABLE_TYPE
            : FORMULA_TABLE_EMBEDDABLE_TYPE;
        container.addNewPanel(
          { panelType, serializedState: { rawState: { savedObjectId: savedObject.id } } },
          true
        );
      },
      savedObjectType: SAVED_OBJECT_TYPE,
      savedObjectName: 'Formula Table',
      getIconForSavedObject: () => 'visTable',
      getSavedObjectSubType: (savedObject) => {
        const attrs = savedObject.attributes as { subType?: string };
        return attrs.subType === FORMULA_DOC_TABLE_EMBEDDABLE_TYPE
          ? 'Formula Doc Table'
          : 'Formula Table';
      },
    });

    return {};
  }

  public start(_core: CoreStart, deps: StartDependencies): FormulaTablePluginStart {
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
      getDisplayName: () => 'Formula Table',
      getIconType: () => 'visTable',
      isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
      execute: async ({ embeddable }) => {
        if (!apiCanAddNewPanel(embeddable)) return;
        embeddable.addNewPanel({ panelType: FORMULA_TABLE_EMBEDDABLE_TYPE }, true);
      },
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_ENHANCED_TABLE_ACTION_ID);

    deps.uiActions.registerAction<EmbeddableApiContext>({
      id: ADD_DOCUMENT_TABLE_ACTION_ID,
      getDisplayName: () => 'Formula Doc Table',
      getIconType: () => 'visTable',
      isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
      execute: async ({ embeddable }) => {
        if (!apiCanAddNewPanel(embeddable)) return;
        embeddable.addNewPanel({ panelType: FORMULA_DOC_TABLE_EMBEDDABLE_TYPE }, true);
      },
    });
    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_DOCUMENT_TABLE_ACTION_ID);

    return {};
  }

  public stop() {}
}

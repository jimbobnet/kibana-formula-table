import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import type { ContentManagementPublicSetup } from '@kbn/content-management-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

export interface FormulaTablePluginSetup {}
export interface FormulaTablePluginStart {}

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface StartDependencies {
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
}

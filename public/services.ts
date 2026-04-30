import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { NotificationsStart, ThemeServiceStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';

export const [getFormatService, setFormatService] =
  createGetterSetter<FieldFormatsStart>('FieldFormats');

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getDataViewsStart, setDataViewsStart] =
  createGetterSetter<DataViewsPublicPluginStart>('dataViews');

export const [getSearchService, setSearchService] =
  createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getThemeService, setThemeService] =
  createGetterSetter<ThemeServiceStart>('ThemeServiceStart');

export const [getUiActions, setUiActions] =
  createGetterSetter<UiActionsStart>('UiActions');

let _embeddableEnhanced: EmbeddableEnhancedPluginStart | undefined;
export const getEmbeddableEnhanced = () => _embeddableEnhanced;
export const setEmbeddableEnhanced = (service: EmbeddableEnhancedPluginStart | undefined) => {
  _embeddableEnhanced = service;
};

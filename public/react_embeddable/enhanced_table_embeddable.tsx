import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { initializeTitleManager } from '@kbn/presentation-publishing';
import { ENH_TABLE_VIS_NAME } from '../../common';
import { ENHANCED_TABLE_DEFAULT_PARAMS } from '../vis_types/enhanced_table/default_params';
import { getEmbeddableEnhanced } from '../services';
import type { EnhancedTableApi, EnhancedTableSerializedState } from './types';
import { EnhancedTableEmbeddableComponent } from './enhanced_table_component';

export type Trigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof ROW_CLICK_TRIGGER;

export const ENHANCED_TABLE_EMBEDDABLE_TYPE = ENH_TABLE_VIS_NAME;

export function createEnhancedTableEmbeddableFactory(): EmbeddableFactory<
  EnhancedTableSerializedState,
  EnhancedTableApi
> {
  return {
    type: ENHANCED_TABLE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid }) => {
      const rawState = initialState.rawState;

      const titleManager = initializeTitleManager(rawState);
      const indexId$ = new BehaviorSubject<string | undefined>(rawState.indexId);
      const aggConfigs$ = new BehaviorSubject<unknown[]>(rawState.aggConfigs ?? []);
      const schemas$ = new BehaviorSubject<Record<string, number[]>>(rawState.schemas ?? {});
      const params$ = new BehaviorSubject(rawState.params ?? { ...ENHANCED_TABLE_DEFAULT_PARAMS });
      const isEditing$ = new BehaviorSubject<boolean>(false);

      const dynamicActionsManager = getEmbeddableEnhanced()?.initializeEmbeddableDynamicActions(
        uuid,
        () => titleManager.api.title$.getValue(),
        initialState
      );

      const updateState = (
        update: Partial<Omit<EnhancedTableSerializedState, 'title'>>
      ) => {
        if (update.indexId !== undefined) indexId$.next(update.indexId);
        if (update.aggConfigs !== undefined) aggConfigs$.next(update.aggConfigs);
        if (update.schemas !== undefined) schemas$.next(update.schemas);
        if (update.params !== undefined) params$.next(update.params);
      };

      const api = finalizeApi({
        ...titleManager.api,
        ...(dynamicActionsManager?.api ?? {}),
        supportedTriggers(): Trigger[] {
          return [VALUE_CLICK_TRIGGER, ROW_CLICK_TRIGGER];
        },
        onEdit: async () => { isEditing$.next(true); },
        isEditingEnabled: () => true,
        getTypeDisplayName: () => 'Enhanced Table 2',
        serializeState: () => ({
          rawState: {
            title: titleManager.api.title$.getValue(),
            ...(dynamicActionsManager?.getLatestState() ?? {}),
            indexId: indexId$.getValue(),
            aggConfigs: aggConfigs$.getValue(),
            schemas: schemas$.getValue(),
            params: params$.getValue(),
          },
        }),
      });

      const Component = () => {
        useEffect(() => {
          const handle = dynamicActionsManager?.startDynamicActions();
          return () => handle?.stopDynamicActions();
        }, []);

        return (
          <EnhancedTableEmbeddableComponent
            api={api}
            indexId$={indexId$}
            aggConfigs$={aggConfigs$}
            schemas$={schemas$}
            params$={params$}
            isEditing$={isEditing$}
            onUpdateState={updateState}
          />
        );
      };

      return { api, Component };
    },
  };
}

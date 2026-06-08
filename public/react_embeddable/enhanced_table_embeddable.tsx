import React, { useEffect } from 'react';
import { BehaviorSubject, merge, map } from 'rxjs';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { initializeTitleManager } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { ENH_TABLE_VIS_NAME, SAVED_OBJECT_TYPE } from '../../common';
import { ENHANCED_TABLE_DEFAULT_PARAMS } from '../vis_types/enhanced_table/default_params';
import { getEmbeddableEnhanced, getSavedObjectsClient } from '../services';
import type { EnhancedTableApi, EnhancedTableSerializedState } from './types';
import { EnhancedTableEmbeddableComponent } from './enhanced_table_component';
import type { EnhancedTableParams } from '../../common/types';

export type Trigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof ROW_CLICK_TRIGGER;

export const ENHANCED_TABLE_EMBEDDABLE_TYPE = ENH_TABLE_VIS_NAME;

interface SOAttributes {
  title: string;
  subType: string;
  indexId?: string;
  aggConfigs?: string;
  schemas?: string;
  params?: string;
}

async function loadStateFromSO(savedObjectId: string): Promise<Partial<EnhancedTableSerializedState>> {
  const so = await getSavedObjectsClient().get<SOAttributes>(SAVED_OBJECT_TYPE, savedObjectId);
  const attrs = so.attributes;
  return {
    indexId: attrs.indexId,
    aggConfigs: attrs.aggConfigs ? (JSON.parse(attrs.aggConfigs) as unknown[]) : [],
    schemas: attrs.schemas ? (JSON.parse(attrs.schemas) as Record<string, number[]>) : {},
    params: attrs.params ? (JSON.parse(attrs.params) as EnhancedTableParams) : { ...ENHANCED_TABLE_DEFAULT_PARAMS },
  };
}

export function createEnhancedTableEmbeddableFactory(): EmbeddableFactory<
  EnhancedTableSerializedState,
  EnhancedTableApi
> {
  return {
    type: ENHANCED_TABLE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const rawState = initialState.rawState;

      // Resolve attributes: load from saved object when by-reference, else use inline state.
      let resolvedAttrs: Partial<EnhancedTableSerializedState> = rawState;
      if (rawState.savedObjectId) {
        try {
          resolvedAttrs = { ...rawState, ...(await loadStateFromSO(rawState.savedObjectId)) };
        } catch {
          resolvedAttrs = rawState;
        }
      }

      const titleManager = initializeTitleManager(rawState);
      const savedObjectId$ = new BehaviorSubject<string | undefined>(rawState.savedObjectId);
      const indexId$ = new BehaviorSubject<string | undefined>(resolvedAttrs.indexId);
      const aggConfigs$ = new BehaviorSubject<unknown[]>(resolvedAttrs.aggConfigs ?? []);
      const schemas$ = new BehaviorSubject<Record<string, number[]>>(resolvedAttrs.schemas ?? {});
      const params$ = new BehaviorSubject(resolvedAttrs.params ?? { ...ENHANCED_TABLE_DEFAULT_PARAMS });
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

      const serializeState = (): { rawState: EnhancedTableSerializedState } => {
        const currentSavedObjectId = savedObjectId$.getValue();
        const base = {
          title: titleManager.api.title$.getValue(),
          ...(dynamicActionsManager?.getLatestState() ?? {}),
        };
        if (currentSavedObjectId) {
          return { rawState: { ...base, savedObjectId: currentSavedObjectId } };
        }
        return {
          rawState: {
            ...base,
            indexId: indexId$.getValue(),
            aggConfigs: aggConfigs$.getValue(),
            schemas: schemas$.getValue(),
            params: params$.getValue(),
          },
        };
      };

      const unsavedChangesApi = initializeUnsavedChanges<EnhancedTableSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          savedObjectId$,
          indexId$,
          aggConfigs$,
          schemas$,
          params$,
          titleManager.anyStateChange$,
          ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : [])
        ).pipe(map(() => undefined as void)),
        getComparators: () => ({
          enhancements: 'deepEquality' as const,
          title: 'referenceEquality' as const,
          savedObjectId: 'referenceEquality' as const,
          indexId: 'referenceEquality' as const,
          aggConfigs: 'deepEquality' as const,
          schemas: 'deepEquality' as const,
          params: 'deepEquality' as const,
        }),
        onReset: (lastSaved) => {
          const raw = lastSaved?.rawState;
          titleManager.reinitializeState({ title: raw?.title });
          dynamicActionsManager?.reinitializeState(raw ?? {});
          savedObjectId$.next(raw?.savedObjectId);
          indexId$.next(raw?.indexId);
          aggConfigs$.next(raw?.aggConfigs ?? []);
          schemas$.next(raw?.schemas ?? {});
          params$.next(raw?.params ?? { ...ENHANCED_TABLE_DEFAULT_PARAMS });
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...(dynamicActionsManager?.api ?? {}),
        ...unsavedChangesApi,
        supportedTriggers(): Trigger[] {
          return [VALUE_CLICK_TRIGGER, ROW_CLICK_TRIGGER];
        },
        onEdit: async () => { isEditing$.next(true); },
        isEditingEnabled: () => true,
        getTypeDisplayName: () => 'Enhanced Table 2',
        serializeState,

        // HasLibraryTransforms
        canLinkToLibrary: async () => !savedObjectId$.getValue(),
        canUnlinkFromLibrary: async () => Boolean(savedObjectId$.getValue()),

        saveToLibrary: async (title: string): Promise<string> => {
          const so = await getSavedObjectsClient().create<SOAttributes>(SAVED_OBJECT_TYPE, {
            title,
            subType: ENHANCED_TABLE_EMBEDDABLE_TYPE,
            indexId: indexId$.getValue(),
            aggConfigs: JSON.stringify(aggConfigs$.getValue()),
            schemas: JSON.stringify(schemas$.getValue()),
            params: JSON.stringify(params$.getValue()),
          });
          return so.id;
        },

        getSerializedStateByReference: (libraryId: string) => ({
          rawState: {
            title: titleManager.api.title$.getValue(),
            ...(dynamicActionsManager?.getLatestState() ?? {}),
            savedObjectId: libraryId,
          } as EnhancedTableSerializedState,
        }),

        getSerializedStateByValue: () => ({
          rawState: {
            title: titleManager.api.title$.getValue(),
            ...(dynamicActionsManager?.getLatestState() ?? {}),
            indexId: indexId$.getValue(),
            aggConfigs: aggConfigs$.getValue(),
            schemas: schemas$.getValue(),
            params: params$.getValue(),
          } as EnhancedTableSerializedState,
        }),

        checkForDuplicateTitle: async (
          newTitle: string,
          isTitleDuplicateConfirmed: boolean,
          onTitleDuplicate: () => void
        ) => {
          if (isTitleDuplicateConfirmed) return;
          const results = await getSavedObjectsClient().find<SOAttributes>({
            type: SAVED_OBJECT_TYPE,
            search: `"${newTitle}"`,
            searchFields: ['title'],
            perPage: 10,
          });
          if (results.savedObjects.some((so) => so.attributes.title === newTitle)) {
            onTitleDuplicate();
          }
        },
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

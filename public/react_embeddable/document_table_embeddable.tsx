import React, { useEffect } from 'react';
import { BehaviorSubject, merge, map } from 'rxjs';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { initializeTitleManager } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { DOC_TABLE_VIS_NAME } from '../../common';
import { DOCUMENT_TABLE_DEFAULT_PARAMS } from '../vis_types/document_table/default_params';
import { getEmbeddableEnhanced } from '../services';
import type { DocumentTableApi, DocumentTableSerializedState } from './types';
import { DocumentTableEmbeddableComponent } from './document_table_component';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';

export type Trigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof ROW_CLICK_TRIGGER;

export const DOCUMENT_TABLE_EMBEDDABLE_TYPE = DOC_TABLE_VIS_NAME;

export function createDocumentTableEmbeddableFactory(): EmbeddableFactory<
  DocumentTableSerializedState,
  DocumentTableApi
> {
  return {
    type: DOCUMENT_TABLE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const rawState = initialState.rawState;

      const titleManager = initializeTitleManager(rawState);
      const indexId$ = new BehaviorSubject<string | undefined>(rawState.indexId);
      const params$ = new BehaviorSubject(rawState.params ?? { ...DOCUMENT_TABLE_DEFAULT_PARAMS });
      const isEditing$ = new BehaviorSubject<boolean>(false);

      const dynamicActionsManager = getEmbeddableEnhanced()?.initializeEmbeddableDynamicActions(
        uuid,
        () => titleManager.api.title$.getValue(),
        initialState
      );

      const updateState = (update: Partial<Omit<DocumentTableSerializedState, 'title'>>) => {
        if (update.indexId !== undefined) indexId$.next(update.indexId);
        if (update.params !== undefined) params$.next(update.params);
      };

      const serializeState = () => ({
        rawState: {
          title: titleManager.api.title$.getValue(),
          ...(dynamicActionsManager?.getLatestState() ?? {}),
          indexId: indexId$.getValue(),
          params: params$.getValue(),
        },
      });

      const unsavedChangesApi = initializeUnsavedChanges<DocumentTableSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          indexId$,
          params$,
          titleManager.anyStateChange$,
          ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : [])
        ).pipe(map(() => undefined as void)),
        getComparators: () => ({
          enhancements: 'deepEquality' as const,
          title: 'referenceEquality' as const,
          indexId: 'referenceEquality' as const,
          params: 'deepEquality' as const,
        }),
        onReset: (lastSaved) => {
          const raw = lastSaved?.rawState;
          titleManager.reinitializeState({ title: raw?.title });
          dynamicActionsManager?.reinitializeState(raw ?? {});
          indexId$.next(raw?.indexId);
          params$.next(raw?.params ?? { ...DOCUMENT_TABLE_DEFAULT_PARAMS });
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
        getTypeDisplayName: () => 'Document Table 2',
        serializeState,
      });

      const Component = () => {
        useEffect(() => {
          const handle = dynamicActionsManager?.startDynamicActions();
          return () => handle?.stopDynamicActions();
        }, []);

        return (
          <DocumentTableEmbeddableComponent
            api={api}
            indexId$={indexId$}
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

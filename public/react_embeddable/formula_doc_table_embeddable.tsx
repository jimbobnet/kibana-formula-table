import React, { useEffect } from 'react';
import { BehaviorSubject, merge, map } from 'rxjs';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { initializeTitleManager } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { DOC_TABLE_VIS_NAME, SAVED_OBJECT_TYPE } from '../../common';
import { DOCUMENT_TABLE_DEFAULT_PARAMS } from '../vis_types/document_table/default_params';
import { getEmbeddableEnhanced, getSavedObjectsClient } from '../services';
import type { DocumentTableApi, DocumentTableSerializedState } from './types';
import { DocumentTableEmbeddableComponent } from './formula_doc_table_component';
import type { DocumentTableParams } from '../../common/types';

export type Trigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof ROW_CLICK_TRIGGER;

export const DOCUMENT_TABLE_EMBEDDABLE_TYPE = DOC_TABLE_VIS_NAME;

interface SOAttributes {
  title: string;
  subType: string;
  indexId?: string;
  params?: string;
}

async function loadStateFromSO(savedObjectId: string): Promise<Partial<DocumentTableSerializedState>> {
  const so = await getSavedObjectsClient().get<SOAttributes>(SAVED_OBJECT_TYPE, savedObjectId);
  const attrs = so.attributes;
  return {
    indexId: attrs.indexId,
    params: attrs.params ? (JSON.parse(attrs.params) as DocumentTableParams) : { ...DOCUMENT_TABLE_DEFAULT_PARAMS },
  };
}

export function createDocumentTableEmbeddableFactory(): EmbeddableFactory<
  DocumentTableSerializedState,
  DocumentTableApi
> {
  return {
    type: DOCUMENT_TABLE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const rawState = initialState.rawState;

      // Resolve attributes: load from saved object when by-reference, else use inline state.
      let resolvedAttrs: Partial<DocumentTableSerializedState> = rawState;
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
      const params$ = new BehaviorSubject(resolvedAttrs.params ?? { ...DOCUMENT_TABLE_DEFAULT_PARAMS });
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

      const serializeState = (): { rawState: DocumentTableSerializedState } => {
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
            params: params$.getValue(),
          },
        };
      };

      const unsavedChangesApi = initializeUnsavedChanges<DocumentTableSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          savedObjectId$,
          indexId$,
          params$,
          titleManager.anyStateChange$,
          ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : [])
        ).pipe(map(() => undefined as void)),
        getComparators: () => ({
          enhancements: 'deepEquality' as const,
          title: 'referenceEquality' as const,
          savedObjectId: 'referenceEquality' as const,
          indexId: 'referenceEquality' as const,
          params: 'deepEquality' as const,
        }),
        onReset: (lastSaved) => {
          const raw = lastSaved?.rawState;
          titleManager.reinitializeState({ title: raw?.title });
          dynamicActionsManager?.reinitializeState(raw ?? {});
          savedObjectId$.next(raw?.savedObjectId);
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
        getTypeDisplayName: () => 'Formula Doc Table',
        serializeState,

        // HasLibraryTransforms
        canLinkToLibrary: async () => true,
        canUnlinkFromLibrary: async () => Boolean(savedObjectId$.getValue()),

        saveToLibrary: async (title: string): Promise<string> => {
          const existingId = savedObjectId$.getValue();
          const attrs = {
            title,
            subType: DOCUMENT_TABLE_EMBEDDABLE_TYPE,
            indexId: indexId$.getValue(),
            params: JSON.stringify(params$.getValue()),
          };
          if (existingId) {
            await getSavedObjectsClient().update<SOAttributes>(SAVED_OBJECT_TYPE, existingId, attrs);
            return existingId;
          }
          const so = await getSavedObjectsClient().create<SOAttributes>(SAVED_OBJECT_TYPE, attrs);
          savedObjectId$.next(so.id);
          return so.id;
        },

        getSerializedStateByReference: (libraryId: string) => ({
          rawState: {
            title: titleManager.api.title$.getValue(),
            ...(dynamicActionsManager?.getLatestState() ?? {}),
            savedObjectId: libraryId,
          } as DocumentTableSerializedState,
        }),

        getSerializedStateByValue: () => ({
          rawState: {
            title: titleManager.api.title$.getValue(),
            ...(dynamicActionsManager?.getLatestState() ?? {}),
            indexId: indexId$.getValue(),
            params: params$.getValue(),
          } as DocumentTableSerializedState,
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

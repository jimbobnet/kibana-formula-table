import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasSupportedTriggers,
  HasEditCapabilities,
  HasLibraryTransforms,
  PublishesUnsavedChanges,
} from '@kbn/presentation-publishing';
import type {
  HasDynamicActions,
  DynamicActionsSerializedState,
} from '@kbn/embeddable-enhanced-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { EnhancedTableParams, DocumentTableParams } from '../../common/types';

export interface EnhancedTableSerializedState extends DynamicActionsSerializedState {
  title?: string;
  savedObjectId?: string;
  indexId?: string;
  aggConfigs?: unknown[];
  schemas?: Record<string, number[]>;
  params?: EnhancedTableParams;
  filters?: Filter[];
}

export interface DocumentTableSerializedState extends DynamicActionsSerializedState {
  title?: string;
  savedObjectId?: string;
  indexId?: string;
  params?: DocumentTableParams;
  filters?: Filter[];
}

export type EnhancedTableApi = DefaultEmbeddableApi<EnhancedTableSerializedState>
  & HasSupportedTriggers
  & HasEditCapabilities
  & HasDynamicActions
  & HasLibraryTransforms<EnhancedTableSerializedState, EnhancedTableSerializedState>
  & PublishesUnsavedChanges;

export type DocumentTableApi = DefaultEmbeddableApi<DocumentTableSerializedState>
  & HasSupportedTriggers
  & HasEditCapabilities
  & HasDynamicActions
  & HasLibraryTransforms<DocumentTableSerializedState, DocumentTableSerializedState>
  & PublishesUnsavedChanges;

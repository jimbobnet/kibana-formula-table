import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSupportedTriggers, HasEditCapabilities } from '@kbn/presentation-publishing';
import type {
  HasDynamicActions,
  DynamicActionsSerializedState,
} from '@kbn/embeddable-enhanced-plugin/public';
import type { EnhancedTableParams, DocumentTableParams } from '../../common/types';

export interface EnhancedTableSerializedState extends DynamicActionsSerializedState {
  title?: string;
  indexId?: string;
  aggConfigs?: unknown[];
  schemas?: Record<string, number[]>;
  params: EnhancedTableParams;
}

export interface DocumentTableSerializedState extends DynamicActionsSerializedState {
  title?: string;
  indexId?: string;
  params: DocumentTableParams;
}

export type EnhancedTableApi = DefaultEmbeddableApi<EnhancedTableSerializedState>
  & HasSupportedTriggers
  & HasEditCapabilities
  & HasDynamicActions;

export type DocumentTableApi = DefaultEmbeddableApi<DocumentTableSerializedState>
  & HasSupportedTriggers
  & HasEditCapabilities
  & HasDynamicActions;

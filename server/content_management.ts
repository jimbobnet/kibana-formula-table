import type { ContentStorage, StorageContext, MSearchConfig } from '@kbn/content-management-plugin/server';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { SAVED_OBJECT_TYPE } from '../common';

interface SOAttributes {
  title: string;
  subType?: string;
}

const notImplemented = (): never => {
  throw new Error('Not implemented');
};

export const CONTENT_LATEST_VERSION = 1;

export class EnhancedTableStorage implements ContentStorage {
  get = notImplemented;
  bulkGet = notImplemented;
  create = notImplemented;
  update = notImplemented;
  delete = notImplemented;
  search = notImplemented;

  mSearch: MSearchConfig = {
    savedObjectType: SAVED_OBJECT_TYPE,
    toItemResult: (
      _ctx: StorageContext,
      savedObject: SavedObjectsFindResult<SOAttributes>
    ) => ({
      id: savedObject.id,
      type: savedObject.type,
      updatedAt: savedObject.updated_at,
      createdAt: savedObject.created_at,
      attributes: {
        title: savedObject.attributes.title ?? '',
        description: '',
        subType: savedObject.attributes.subType,
      },
      references: savedObject.references,
      namespaces: savedObject.namespaces,
      version: savedObject.version,
    }),
  };
}

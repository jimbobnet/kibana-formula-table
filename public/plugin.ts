import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { SAVED_OBJECT_TYPE } from '../common';
import { EnhancedTableStorage, CONTENT_LATEST_VERSION } from './content_management';

interface SetupDeps {
  contentManagement: ContentManagementServerSetup;
}

export class FormulaTableServerPlugin implements Plugin {
  public setup(core: CoreSetup, { contentManagement }: SetupDeps) {
    core.savedObjects.registerType({
      name: SAVED_OBJECT_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: {
        properties: {
          title:      { type: 'text' },
          subType:    { type: 'keyword' },
          indexId:    { type: 'keyword' },
          aggConfigs: { type: 'text', index: false },
          schemas:    { type: 'text', index: false },
          params:     { type: 'text', index: false },
        },
      },
      management: {
        importableAndExportable: true,
        getTitle: (obj) => (obj.attributes as { title: string }).title,
        icon: 'visTable',
        defaultSearchField: 'title',
      },
    });

    contentManagement.register({
      id: SAVED_OBJECT_TYPE,
      storage: new EnhancedTableStorage(),
      version: { latest: CONTENT_LATEST_VERSION },
    });
  }

  public start(_core: CoreStart) {}
  public stop() {}
}

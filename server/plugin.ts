import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { SAVED_OBJECT_TYPE } from '../common';

export class EnhancedTable2ServerPlugin implements Plugin {
  public setup(core: CoreSetup) {
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
  }

  public start(_core: CoreStart) {}
  public stop() {}
}

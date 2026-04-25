import { EnhancedTable2Plugin } from './plugin';

export function plugin() {
  return new EnhancedTable2Plugin();
}

export type { EnhancedTable2PluginSetup, EnhancedTable2PluginStart } from './types';

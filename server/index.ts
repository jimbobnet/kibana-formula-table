import type { PluginInitializerContext } from '@kbn/core/server';
import { EnhancedTable2ServerPlugin } from './plugin';

export function plugin(_ctx: PluginInitializerContext) {
  return new EnhancedTable2ServerPlugin();
}

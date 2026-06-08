import type { PluginInitializerContext } from '@kbn/core/server';
import { FormulaTableServerPlugin } from './plugin';

export function plugin(_ctx: PluginInitializerContext) {
  return new FormulaTableServerPlugin();
}

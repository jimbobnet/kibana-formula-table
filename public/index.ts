import { FormulaTablePlugin } from './plugin';

export function plugin() {
  return new FormulaTablePlugin();
}

export type { FormulaTablePluginSetup, FormulaTablePluginStart } from './types';

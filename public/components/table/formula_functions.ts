import moment from 'moment';
import { computeDurationStructureBrokenDownByTimeUnit } from './time_utils';

// Guard against ReDoS: reject patterns that are too long or contain nested quantifiers
// such as (a+)+ or (x*)* which cause catastrophic backtracking in the JS regex engine.
const isSafePattern = (pattern: string): boolean => {
  if (pattern.length > 200) return false;
  // Nested quantifier idioms: a quantified group followed by another quantifier
  if (/\([^)]*[+*][^)]*\)[+*?{]/.test(pattern)) return false;
  return true;
};

const safeRegExp = (pattern: string, flags?: string): RegExp | null => {
  if (!isSafePattern(pattern)) return null;
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
};

export const FORMULA_FUNCTIONS: Record<string, (...args: any[]) => any> = {
  now: () => Date.now(),

  indexOf: (str: string, search: string) => String(str).indexOf(search),
  lastIndexOf: (str: string, search: string) => String(str).lastIndexOf(search),
  replace: (str: string, search: string, replacement: string) =>
    String(str).replace(search, replacement),
  replaceRegexp: (str: string, pattern: string, replacement: string) => {
    const re = safeRegExp(pattern, 'g');
    return re ? String(str).replace(re, replacement) : String(str);
  },
  search: (str: string, pattern: string) => {
    const re = safeRegExp(pattern);
    return re ? String(str).search(re) : -1;
  },
  substring: (str: string, start: number, end?: number) => String(str).substring(start, end),
  toLowerCase: (str: string) => String(str).toLowerCase(),
  toUpperCase: (str: string) => String(str).toUpperCase(),
  trim: (str: string) => String(str).trim(),
  encodeURIComponent: (str: string) => encodeURIComponent(String(str)),
  split: (str: string, separator: string) => String(str).split(separator),
  match: (str: string, pattern: string) => {
    const re = safeRegExp(pattern);
    if (!re) return null;
    const m = String(str).match(re);
    return m ? m[0] : null;
  },
  sort: (arr: any[]) => (Array.isArray(arr) ? [...arr].sort() : arr),
  uniq: (arr: any[]) => (Array.isArray(arr) ? [...new Set(arr)] : arr),
  isArray: (val: any) => Array.isArray(val),
  parseInt: (val: string) => Number.parseInt(String(val), 10),

  formatDate: (val: any, fmt: string) => {
    const m = moment(typeof val === 'number' ? val : String(val));
    return m.isValid() ? m.format(fmt) : String(val);
  },

  parseDate: (str: string, fmt?: string) =>
    fmt ? moment(str, fmt).valueOf() : Date.parse(str),

  dateObject: (...params: any[]) => {
    const d = new Date(...(params as [any]));
    return {
      fullYear: d.getFullYear(),
      month: d.getMonth(),
      date: d.getDate(),
      day: d.getDay(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
      seconds: d.getSeconds(),
      milliseconds: d.getMilliseconds(),
      time: d.getTime(),
      isoString: d.toISOString(),
      localeString: d.toLocaleString(),
    };
  },

  durationObject: (durationInMillis: number) =>
    computeDurationStructureBrokenDownByTimeUnit(durationInMillis),
};

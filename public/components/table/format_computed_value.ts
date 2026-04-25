import moment from 'moment';
import numeral from '@elastic/numeral';
import { DurationHumanVeryPreciseFormat } from './time_utils';
import type { ComputedColumn } from '../../../common/types';

export const formatComputedColumnValue = (value: unknown, cc: ComputedColumn): string => {
  if (value == null) return '';

  switch (cc.format) {
    case 'number': {
      const n = Number(value);
      if (isNaN(n)) return String(value);
      return cc.pattern ? numeral(n).format(cc.pattern) : String(n);
    }

    case 'date': {
      const m = moment(typeof value === 'number' ? value : String(value));
      return m.isValid() ? m.format(cc.datePattern || 'YYYY-MM-DD HH:mm:ss') : String(value);
    }

    case 'duration': {
      const n = Number(value);
      if (isNaN(n)) return String(value);
      const inputFmt = cc.durationInputFormat ?? 'milliseconds';
      const outputFmt = cc.durationOutputFormat ?? 'humanize';

      if (outputFmt === 'humanizeVeryPrecise') {
        return new DurationHumanVeryPreciseFormat({
          inputFormat: inputFmt,
          outputFormat: outputFmt,
          useShortSuffix: cc.durationUseShortSuffix ?? false,
          includeSpaceWithSuffix: cc.durationIncludeSpaceWithSuffix ?? true,
        }).convert(n);
      }

      if (outputFmt === 'humanize') {
        return moment.duration(n, inputFmt as moment.DurationInputArg2).humanize();
      }

      // asXxx formats — convert and apply precision
      const unit = outputFmt.replace(/^as/, '').toLowerCase() as moment.unitOfTime.Base;
      const converted = moment.duration(n, inputFmt as moment.DurationInputArg2).as(unit);
      const precision = cc.durationOutputPrecision ?? 0;
      return converted.toFixed(precision);
    }

    default:
      return String(value);
  }
};

const TIME_UNITS = [
  { name: 'years', shortName: 'y', durationInMillis: 365 * 24 * 60 * 60 * 1000 },
  { name: 'months', shortName: 'mon', durationInMillis: 30 * 24 * 60 * 60 * 1000 },
  { name: 'weeks', shortName: 'w', durationInMillis: 7 * 24 * 60 * 60 * 1000 },
  { name: 'days', shortName: 'd', durationInMillis: 24 * 60 * 60 * 1000 },
  { name: 'hours', shortName: 'h', durationInMillis: 60 * 60 * 1000 },
  { name: 'minutes', shortName: 'min', durationInMillis: 60 * 1000 },
  { name: 'seconds', shortName: 's', durationInMillis: 1000 },
  { name: 'milliseconds', shortName: 'ms', durationInMillis: 1 },
] as const;

export interface DurationStructure {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export const computeDurationStructureBrokenDownByTimeUnit = (durationInMillis: number): DurationStructure => {
  const milliseconds = durationInMillis % 1000;
  const durationInSeconds = Math.floor(durationInMillis / 1000);
  const seconds = durationInSeconds % 60;
  const durationInMinutes = Math.floor(durationInSeconds / 60);
  const minutes = durationInMinutes % 60;
  const durationInHours = Math.floor(durationInMinutes / 60);
  const hours = durationInHours % 24;
  const durationInDays = Math.floor(durationInHours / 24);
  let remainingDays = durationInDays;
  const years = Math.floor(remainingDays / 365);
  remainingDays = remainingDays % 365;
  const months = Math.floor(remainingDays / 30);
  remainingDays = remainingDays % 30;
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays % 7;
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds };
};

interface DurationHumanVeryPreciseFormatOptions {
  inputFormat: string;
  outputFormat: string;
  useShortSuffix: boolean;
  includeSpaceWithSuffix: boolean;
}

export class DurationHumanVeryPreciseFormat {
  private readonly options: DurationHumanVeryPreciseFormatOptions;

  constructor(options: DurationHumanVeryPreciseFormatOptions) {
    this.options = options;
  }

  convert(duration: number): string {
    const inputUnit = TIME_UNITS.find((u) => u.name === this.options.inputFormat);
    const durationInMillis = duration * (inputUnit?.durationInMillis ?? 1);
    const breakdown = computeDurationStructureBrokenDownByTimeUnit(durationInMillis);

    let result = '';
    for (const unit of TIME_UNITS) {
      const count = breakdown[unit.name as keyof DurationStructure];
      if (count > 0) {
        const suffix = this.options.useShortSuffix ? unit.shortName : unit.name;
        const space = this.options.includeSpaceWithSuffix ? ' ' : '';
        result += `${count}${space}${suffix} `;
      }
    }
    return result.trim();
  }
}

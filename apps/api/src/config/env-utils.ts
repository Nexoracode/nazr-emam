const durationPattern = /^(\d+)(ms|s|m|h|d)$/;

export const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

export const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const durationToMilliseconds = (
  value: string | undefined,
  fallback: string,
): number => {
  const source = value ?? fallback;
  const match = durationPattern.exec(source);

  if (!match) {
    return durationToMilliseconds(fallback, '1h');
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit as keyof typeof multipliers];
};

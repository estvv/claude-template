const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "dans 3 jours", "il y a 2 heures". */
export function relativeTime(date: Date): string {
  const diff = date.getTime() - Date.now();
  const absolute = Math.abs(diff);

  for (const [unit, ms] of UNITS) {
    if (absolute >= ms) {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "à l'instant";
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

const dateFormatter = new Intl.DateTimeFormat("fr", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date): string {
  return dateFormatter.format(date);
}

const dayFormatter = new Intl.DateTimeFormat("fr", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatDay(date: Date): string {
  return dayFormatter.format(date);
}

const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "UTC";

const DATE_FORMATTER = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: DISPLAY_TIME_ZONE,
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: DISPLAY_TIME_ZONE,
  timeZoneName: "short",
});

type DateInput = string | number | Date | null | undefined;

function validDate(value: DateInput) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcDate(value: DateInput) {
  const date = validDate(value);
  return date ? DATE_FORMATTER.format(date) : "";
}

export function formatUtcDateTime(value: DateInput) {
  const date = validDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : "";
}

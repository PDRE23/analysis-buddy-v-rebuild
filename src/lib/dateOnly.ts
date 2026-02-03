const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnlyString(value?: string): value is string {
  return Boolean(value && DATE_ONLY_REGEX.test(value));
}

export function parseDateOnly(value?: string): Date | undefined {
  if (!value || !DATE_ONLY_REGEX.test(value)) return undefined;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return undefined;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

export function parseDateInput(value?: string): Date | undefined {
  if (!value) return undefined;
  if (isDateOnlyString(value)) return parseDateOnly(value);
  const date = new Date(value);
  if (isNaN(date.getTime())) return undefined;
  return date;
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateOnlyDisplay(value?: string, fallback = "Not set"): string {
  const date = parseDateInput(value);
  return date ? date.toLocaleDateString() : fallback;
}

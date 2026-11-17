export const TZ = "Asia/Manila";
export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 22;
export const MAX_DAYS_AHEAD = 30;
export const HOURS: number[] = Array.from(
  { length: CLOSE_HOUR - OPEN_HOUR },
  (_, i) => OPEN_HOUR + i,
);

export function manilaNow(now: Date = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

function parseDate(date: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const check = new Date(Date.UTC(y, m - 1, d));
    if (
      check.getUTCFullYear() === y &&
      check.getUTCMonth() === m - 1 &&
      check.getUTCDate() === d
    ) {
      return [y, m, d];
    }
  }
  throw new Error(`Invalid date: ${date}`);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function resolveDate(param: unknown, today: string): string {
  if (typeof param !== "string") return today;
  try {
    const max = addDays(today, MAX_DAYS_AHEAD);
    if (param >= today && param <= max && addDays(param, 0) === param) {
      return param;
    }
  } catch {
    return today;
  }
  return today;
}

export function toggleHour(picked: number[], h: number): number[] {
  if (picked.length === 0) return [h];
  const lo = Math.min(...picked);
  const hi = Math.max(...picked);
  if (picked.includes(h)) {
    return h === lo || h === hi ? picked.filter((x) => x !== h) : [h];
  }
  if (h === lo - 1 || h === hi + 1) return [...picked, h].sort((a, b) => a - b);
  return [h];
}

export function formatHour(h: number): string {
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h % 24 < 12 ? "AM" : "PM";
  return `${hour12}:00 ${suffix}`;
}

export function formatHour24(h: number): string {
  return `${String(h % 24).padStart(2, "0")}:00`;
}

export function formatRange24(hours: number[]): string {
  if (hours.length === 0) {
    throw new Error("formatRange24 needs at least one hour");
  }
  const start = Math.min(...hours);
  const end = Math.max(...hours) + 1;
  return `${formatHour24(start)} – ${formatHour24(end)}`;
}

export function formatRange(hours: number[]): string {
  if (hours.length === 0) {
    throw new Error("formatRange needs at least one hour");
  }
  const start = Math.min(...hours);
  const end = Math.max(...hours) + 1;
  return `${formatHour(start)} – ${formatHour(end)}`;
}

export function hasStarted(date: string, firstHour: number, now: Date = new Date()): boolean {
  const today = manilaNow(now);
  return date < today.date || (date === today.date && firstHour <= today.hour);
}

const submittedFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatSubmitted(iso: string): string {
  return submittedFormat.format(new Date(iso)).replace(/\u202f/g, " ");
}

export function formatDate(date: string): string {
  const [y, m, d] = parseDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export type BookingInput = {
  name: string;
  email: string;
  contact: string;
  expectedPax: string;
  dgroupLeader: string;
  consent: boolean;
  date: string;
  hours: number[];
};

export function isRealDate(date: string): boolean {
  try {
    return addDays(date, 0) === date;
  } catch {
    return false;
  }
}

export type FieldErrors = {
  name?: string;
  email?: string;
  contact?: string;
  expectedPax?: string;
  consent?: string;
};

export function validateFields(
  b: Pick<BookingInput, "name" | "email" | "contact" | "expectedPax" | "consent">,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!b.name.trim()) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!/^(09|\+639)\d{9}$/.test(b.contact.replace(/[\s-]/g, ""))) {
    errors.contact = "Please enter a valid PH mobile number (e.g. 0917 123 4567).";
  }
  const pax = b.expectedPax.trim();
  if (!pax) {
    errors.expectedPax = "Please enter how many people you expect.";
  } else if (!/^\d{1,3}$/.test(pax) || Number(pax) < 1 || Number(pax) > 100) {
    errors.expectedPax = "Please enter a whole number from 1 to 100.";
  }
  if (!b.consent) errors.consent = "Please tick the box to continue.";
  return errors;
}

export function validateBooking(b: BookingInput, now: Date = new Date()): string | null {
  const fields = validateFields(b);
  const firstField = fields.name ?? fields.email ?? fields.contact ?? fields.expectedPax ?? fields.consent;
  if (firstField) return firstField;
  if (!isRealDate(b.date)) return "Please pick a date.";
  if (b.hours.length === 0) return "Please pick at least one time slot.";
  if (b.hours.some((h) => !HOURS.includes(h))) return "Invalid time slot.";
  const sorted = [...b.hours].sort((a, c) => a - c);
  if (sorted.some((h, i) => i > 0 && h !== sorted[i - 1] + 1)) {
    return "Please pick time slots that are next to each other.";
  }
  const today = manilaNow(now);
  if (b.date < today.date || b.date > addDays(today.date, MAX_DAYS_AHEAD)) {
    return "You can book from today up to 30 days ahead.";
  }
  if (b.date === today.date && sorted[0] <= today.hour) {
    return "That time slot has already started or passed.";
  }
  return null;
}

export function byFloorThenName(
  a: { floor: number; name: string },
  b: { floor: number; name: string },
): number {
  return a.floor - b.floor || a.name.localeCompare(b.name, undefined, { numeric: true });
}

export type BlockInput = { date: string; from: number; to: number; label: string };

export function validateBlock(b: BlockInput): string | null {
  if (!isRealDate(b.date)) return "Please pick a date.";
  if (
    !Number.isInteger(b.from) ||
    !Number.isInteger(b.to) ||
    b.from < OPEN_HOUR ||
    b.to > CLOSE_HOUR
  ) {
    return `Pick hours between ${formatHour(OPEN_HOUR)} and ${formatHour(CLOSE_HOUR)}.`;
  }
  if (b.from >= b.to) return "The end hour must be after the start hour.";
  const label = b.label.trim();
  if (!label) return "Please enter a label.";
  if (label.length > 80) return "The label must be 80 characters or fewer.";
  return null;
}

export function groupByToken<T extends { cancel_token: string; hour: number }>(
  rows: T[],
): (T & { hours: number[] })[] {
  const groups = new Map<string, { first: T; hours: number[] }>();
  for (const row of rows) {
    const group = groups.get(row.cancel_token);
    if (group) {
      group.hours.push(row.hour);
    } else {
      groups.set(row.cancel_token, { first: row, hours: [row.hour] });
    }
  }
  return [...groups.values()].map(({ first, hours }) => ({
    ...first,
    hours: hours.sort((a, b) => a - b),
  }));
}

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function startOfWeek(date: string): string {
  const [y, m, d] = parseDate(date);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

export function weekDates(date: string): string[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(date: string): string {
  const [, , d] = parseDate(date);
  return addDays(date, 1 - d);
}

export function startOfNextMonth(date: string): string {
  return `${addDays(startOfMonth(date), 31).slice(0, 8)}01`;
}

export function manilaStartOfDay(date: string): Date {
  parseDate(date);
  return new Date(`${date}T00:00:00+08:00`);
}

export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatLongDate(date: string): string {
  const [y, m, d] = parseDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatMonthDay(date: string): string {
  const [y, m, d] = parseDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export const DEFAULT_DAILY_LIMIT = 3;
export const MIN_DAILY_LIMIT = 1;
export const MAX_DAILY_LIMIT = 20;

export function normalizeContact(contact: string): string {
  const clean = contact.replace(/[\s-]/g, "");
  return /^\+639\d{9}$/.test(clean) ? `0${clean.slice(3)}` : clean;
}

export function contactVariants(contact: string): string[] {
  const local = normalizeContact(contact);
  return /^09\d{9}$/.test(local) ? [local, `+63${local.slice(1)}`] : [local];
}

export function parseDailyLimit(raw: unknown): number | null {
  let value: number;
  if (typeof raw === "number") {
    value = raw;
  } else if (typeof raw === "string" && /^\d{1,3}$/.test(raw.trim())) {
    value = Number(raw.trim());
  } else {
    return null;
  }
  return Number.isInteger(value) && value >= MIN_DAILY_LIMIT && value <= MAX_DAILY_LIMIT
    ? value
    : null;
}

export function validateDailyLimit(raw: string): string | null {
  return parseDailyLimit(raw) === null
    ? `Enter a whole number from ${MIN_DAILY_LIMIT} to ${MAX_DAILY_LIMIT}.`
    : null;
}

export function manilaDayRange(date: string): { start: string; end: string } {
  return {
    start: manilaStartOfDay(date).toISOString(),
    end: manilaStartOfDay(addDays(date, 1)).toISOString(),
  };
}

export function limitReached(count: number, limit: number): boolean {
  return count >= limit;
}

export function dailyLimitMessage(limit: number): string {
  return `You've reached today's limit of ${limit} ${limit === 1 ? "booking" : "bookings"}. Please try again tomorrow.`;
}

export const MIN_ROOM_PAX = 1;
export const MAX_ROOM_PAX = 100;

export function parseRoomPax(
  text: string,
): { ok: true; pax: number | null } | { ok: false; error: string } {
  const t = text.trim();
  if (t === "") return { ok: true, pax: null };
  if (/^\d{1,3}$/.test(t)) {
    const n = Number(t);
    if (n >= MIN_ROOM_PAX && n <= MAX_ROOM_PAX) return { ok: true, pax: n };
  }
  return { ok: false, error: `Enter a whole number from ${MIN_ROOM_PAX} to ${MAX_ROOM_PAX}.` };
}

export const MAX_SEARCH_LENGTH = 100;

export function searchPattern(term: string): string {
  return term
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[,()"*]/g, "_");
}

export function emailFailureReason(error: unknown): string {
  const e = (typeof error === "object" && error !== null ? error : {}) as {
    code?: unknown;
    responseCode?: unknown;
    message?: unknown;
  };
  const code = typeof e.code === "string" ? e.code : "";
  const response = typeof e.responseCode === "number" ? e.responseCode : 0;
  const message = typeof e.message === "string" ? e.message : String(error ?? "");

  if (/missing environment variable/i.test(message)) {
    return "The email settings are missing on the server.";
  }
  if (code === "EAUTH" || /invalid login|username and password not accepted/i.test(message)) {
    return "Gmail refused the sign-in. Check the Gmail address and app password.";
  }
  if (/sending limit|quota|rate limit/i.test(message)) {
    return "Gmail's sending limit was reached. Try again later.";
  }
  if (
    code === "EENVELOPE" ||
    (response >= 550 && response < 560) ||
    /recipient|address.*(rejected|invalid)|user unknown/i.test(message)
  ) {
    return "The email address was rejected by the receiving server.";
  }
  if (
    ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS", "ECONNRESET"].includes(code) ||
    /timeout|timed out|greeting never received/i.test(message)
  ) {
    return "Gmail did not answer in time (connection problem).";
  }
  return "The email could not be sent.";
}

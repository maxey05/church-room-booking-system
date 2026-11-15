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

export function formatRange(hours: number[]): string {
  if (hours.length === 0) {
    throw new Error("formatRange needs at least one hour");
  }
  const start = Math.min(...hours);
  const end = Math.max(...hours) + 1;
  return `${formatHour(start)} – ${formatHour(end)}`;
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

export function validateBooking(b: BookingInput, now: Date = new Date()): string | null {
  if (!b.name.trim()) return "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
    return "Please enter a valid email address.";
  }
  if (!/^(09|\+639)\d{9}$/.test(b.contact.replace(/[\s-]/g, ""))) {
    return "Please enter a valid PH mobile number (e.g. 0917 123 4567).";
  }
  if (!b.consent) return "Please agree to the privacy notice.";
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

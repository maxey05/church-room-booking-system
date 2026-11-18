import Form from "next/form";
import { isMissingEmailLog } from "@/lib/admin";
import {
  addDays,
  formatDate,
  formatRange,
  formatSubmitted,
  isRealDate,
  manilaDayRange,
  manilaNow,
  MAX_SEARCH_LENGTH,
  searchPattern,
} from "@/lib/rules";
import { db, requireAdmin, type EmailLogRow, type EmailStatus } from "@/lib/supabase";
import DateField from "../date-field";
import { Tabs } from "../parts";
import RoomSelect from "../room-select";
import EmailTable, { type EmailRow } from "./email-table";

type Notice = { role: "status" | "alert"; className: string; text: string };

const MAX_ROWS = 500;
const DEFAULT_DAYS = 7;
const ID = /^\d{1,12}$/;

const TABS: { key: "all" | EmailStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
  { key: "resent", label: "Resent" },
];

const TYPES = [
  { value: "", label: "All emails" },
  { value: "approval", label: "Approvals" },
  { value: "decline", label: "Declines" },
  { value: "cancellation", label: "Cancellations" },
];

const field =
  "min-h-11 rounded-pill border border-line bg-surface px-4 text-base font-normal text-ink hover:border-outline motion-safe:transition-[border-color] motion-safe:duration-300 motion-safe:delay-75";
const label = "flex flex-col gap-2 text-[13px] font-medium leading-[18px]";

async function loadNotice(
  sp: Record<string, string | string[] | undefined>,
): Promise<Notice | null> {
  const notice = sp.notice;
  if (notice === "stale") {
    return {
      role: "status",
      className: "text-ink-muted",
      text: "That email was already resent or can no longer be sent, so nothing changed.",
    };
  }
  if (notice === "cancelled") {
    return {
      role: "status",
      className: "text-ink-muted",
      text: "That booking was cancelled, so the approval email was not resent.",
    };
  }
  if (notice !== "resent") return null;

  const id = typeof sp.e === "string" && ID.test(sp.e) ? Number(sp.e) : null;
  const { data, error } =
    id === null
      ? { data: null, error: null }
      : await db()
          .from("email_log")
          .select("status, recipient_name, recipient_email")
          .eq("id", id)
          .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { role: "status", className: "font-semibold text-success", text: "Email resent." };
  }
  const row = data as Pick<EmailLogRow, "status" | "recipient_name" | "recipient_email">;
  if (row.status === "failed") {
    return {
      role: "alert",
      className: "font-semibold text-warning",
      text: `We tried again, but the email to ${row.recipient_name} still couldn't be sent. Please contact them yourself: ${row.recipient_email}.`,
    };
  }
  return {
    role: "status",
    className: "font-semibold text-success",
    text: `Resent. ${row.recipient_name} has been emailed.`,
  };
}

export default async function EmailLogPage({ searchParams }: PageProps<"/admin/email-log">) {
  await requireAdmin();

  const today = manilaNow().date;
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const dateOr = (key: string, fallback: string) =>
    isRealDate(one(key)) ? one(key) : fallback;
  const from = dateOr("from", addDays(today, -DEFAULT_DAYS));
  const to = dateOr("to", today);
  const q = one("q").trim().slice(0, MAX_SEARCH_LENGTH);
  const type = TYPES.some((t) => t.value === one("type") && t.value !== "") ? one("type") : "";
  const active = TABS.find((t) => t.key === one("status"))?.key ?? "all";

  let query = db()
    .from("email_log")
    .select("*")
    .gte("created_at", manilaDayRange(from).start)
    .lt("created_at", manilaDayRange(to).end)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(MAX_ROWS);
  if (type) query = query.eq("kind", type);
  if (q) {
    const p = searchPattern(q);
    query = query.or(`recipient_name.ilike.%${p}%,recipient_email.ilike.%${p}%`);
  }

  const [{ data, error }, notice] = await Promise.all([query, loadNotice(sp)]);

  if (error) {
    if (!isMissingEmailLog(error)) throw new Error(error.message);
    return (
      <div className="flex flex-col gap-6">
        <h1>Email Log</h1>
        <div className="rounded-card-mobile border border-dashed border-outline bg-mist p-8 text-center">
          <p className="text-lg font-medium text-navy">The email log isn&apos;t set up yet</p>
          <p className="mt-1 text-ink-muted">
            Run supabase/migrations/012_email_log.sql in the Supabase SQL Editor, then refresh
            this page.
          </p>
        </div>
      </div>
    );
  }

  const logs = (data ?? []) as EmailLogRow[];
  const truncated = logs.length >= MAX_ROWS;

  const counts: Record<string, number> = { all: logs.length };
  for (const l of logs) counts[l.status] = (counts[l.status] ?? 0) + 1;
  const shown = active === "all" ? logs : logs.filter((l) => l.status === active);

  const rows: EmailRow[] = shown.map((l) => ({
    id: l.id,
    kind: l.kind,
    status: l.status,
    name: l.recipient_name,
    email: l.recipient_email,
    room: `${l.room_name} · Floor ${l.floor}`,
    date: formatDate(l.booking_date),
    time: formatRange(l.hours),
    sent: formatSubmitted(l.created_at),
    error: l.error,
  }));

  function paramsFor(key: string): URLSearchParams {
    const params = new URLSearchParams();
    if (isRealDate(one("from"))) params.set("from", from);
    if (isRealDate(one("to"))) params.set("to", to);
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    if (key !== "all") params.set("status", key);
    return params;
  }

  function tabHref(key: string): string {
    const s = paramsFor(key).toString();
    return s ? `/admin/email-log?${s}` : "/admin/email-log";
  }

  return (
    <div className="flex flex-col gap-6">
      <h1>Email Log</h1>

      {notice && (
        <p role={notice.role} className={notice.className}>
          {notice.text}
        </p>
      )}

      <Form action="/admin/email-log" className="flex flex-wrap items-end gap-3">
        {active !== "all" && <input type="hidden" name="status" value={active} />}
        <label className={`${label} min-w-56 flex-1`}>
          Search
          <span className="relative flex">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Name or email"
              className={`${field} w-full pl-10`}
            />
          </span>
        </label>
        <label className={label}>
          Email type
          <RoomSelect
            name="type"
            defaultValue={type}
            options={TYPES}
            className={`${field} min-w-48`}
          />
        </label>
        <label className={label}>
          From
          <DateField name="from" defaultValue={from} className={field} />
        </label>
        <label className={label}>
          To
          <DateField name="to" defaultValue={to} className={field} />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-pill bg-brand-strong px-5 text-sm font-medium text-surface hover:bg-navy motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75"
        >
          Filter
        </button>
      </Form>

      <section
        aria-label="Emails"
        className="overflow-hidden rounded-card-mobile border border-line bg-surface"
      >
        <div className="border-b border-line px-4 py-3">
          <Tabs
            label="Email status"
            current={active}
            items={TABS.map((t) => ({
              key: t.key,
              label: t.label,
              href: tabHref(t.key),
              count: counts[t.key] ?? 0,
            }))}
          />
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-ink-muted">No emails match</p>
        ) : (
          <EmailTable rows={rows} backQuery={paramsFor(active).toString()} />
        )}

        <div className="border-t border-line px-6 py-3 text-[13px] leading-[18px] text-ink-muted">
          {truncated && (
            <p role="status" className="mb-1 font-medium text-warning">
              Showing the first {logs.length} emails. Narrow the filters to see the rest.
            </p>
          )}
          <p>
            Showing {shown.length} of {logs.length} emails from {formatDate(from)} to{" "}
            {formatDate(to)}
          </p>
        </div>
      </section>
    </div>
  );
}

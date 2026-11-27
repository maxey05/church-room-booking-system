import Link from "next/link";
import { loadPendingRequests, type PendingGroup } from "@/lib/admin";
import { formatDate, formatRange, formatSubmitted } from "@/lib/rules";
import { db, requireAdmin } from "@/lib/supabase";
import { approveRequest, declineRequest } from "../actions";
import { Ribbon, Tabs } from "../parts";
import { ApproveButton } from "./approve-button";
import { DeclineButton } from "./decline-button";
import { ResultToast, type ToastNotice } from "./result-toast";

type Filter = "all" | "over24" | "floor1" | "floor2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "over24", label: "Waiting over 24 hrs" },
  { value: "floor1", label: "Floor 1" },
  { value: "floor2", label: "Floor 2" },
];

function parseFilter(value: unknown): Filter {
  return FILTERS.some((f) => f.value === value) ? (value as Filter) : "all";
}

function matches(g: PendingGroup, filter: Filter, nowMs: number): boolean {
  if (filter === "over24") return nowMs - new Date(g.created_at).getTime() >= DAY_MS;
  if (filter === "floor1") return g.rooms?.floor === 1;
  if (filter === "floor2") return g.rooms?.floor === 2;
  return true;
}

function pageHref(filter: Filter, id?: string): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (id) params.set("id", id);
  const qs = params.toString();
  return qs ? `/admin/pending?${qs}` : "/admin/pending";
}

function ageLabel(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function initials(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

async function loadNotice(
  sp: Record<string, string | string[] | undefined>,
): Promise<ToastNotice | null> {
  const notice = sp.notice;
  if (notice === "stale") {
    return {
      key: "stale",
      kind: "neutral",
      title: "Nothing changed",
      text: "That request was already handled or its time has started.",
    };
  }
  if (notice !== "approved" && notice !== "declined") return null;
  const sent = sp.sent;
  const token = sp.t;
  if ((sent !== "1" && sent !== "0") || typeof token !== "string" || !UUID.test(token)) {
    return null;
  }
  const { data, error } = await db()
    .from("bookings")
    .select("name, email, contact")
    .eq("cancel_token", token)
    .eq("kind", "booking")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const b = data as { name: string; email: string | null; contact: string | null };
  const key = `${notice}-${sent}-${token}`;
  if (sent === "0") {
    return {
      key,
      kind: "warning",
      title:
        notice === "approved"
          ? "Approved, but the email didn't send"
          : "Declined, but the email didn't send",
      text: `Please contact ${b.name} yourself: ${b.email || "—"}, ${b.contact || "—"}.`,
    };
  }
  if (notice === "approved") {
    return { key, kind: "success", title: "Request approved", text: `${b.name} has been emailed.` };
  }
  return {
    key,
    kind: "danger",
    title: "Request declined",
    text: `A decline email was sent to ${b.name}. The hours are free again.`,
  };
}

function Decisions({ g, filter }: { g: PendingGroup; filter: Filter }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={approveRequest.bind(null, g.cancel_token, filter)}>
        <ApproveButton />
      </form>
      <DeclineButton
        key={g.cancel_token}
        action={declineRequest.bind(null, g.cancel_token, filter)}
        name={g.name}
        room={g.rooms?.name ?? "Room"}
        date={formatDate(g.date)}
        time={formatRange(g.hours)}
      />
    </div>
  );
}

function Row({
  g,
  filter,
  selected,
  nowMs,
}: {
  g: PendingGroup;
  filter: Filter;
  selected: boolean;
  nowMs: number;
}) {
  const ageMs = nowMs - new Date(g.created_at).getTime();
  const overdue = ageMs >= DAY_MS;
  const who = g.name;
  const line = [
    g.rooms?.name ?? null,
    `${formatDate(g.date)}, ${formatRange(g.hours)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line px-5 py-3 first:border-t-0 ${
        selected
          ? "bg-brand-soft shadow-[inset_3px_0_0_var(--color-brand-strong)]"
          : "hover:bg-bg"
      } motion-safe:transition-[background-color] motion-safe:duration-300 motion-safe:delay-75`}
    >
      <Link
        href={`${pageHref(filter, g.cancel_token)}#detail`}
        aria-current={selected ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-[1_1_16rem] items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="grid size-9 flex-none place-items-center rounded-pill bg-brand-soft text-xs font-semibold text-navy"
        >
          {initials(who)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium [overflow-wrap:anywhere]">{who}</span>
          <span className="text-[13px] leading-[18px] text-ink-muted [overflow-wrap:anywhere]">
            {line}
          </span>
        </span>
      </Link>
      <Ribbon hours={g.hours} pending />
      <span
        className={`min-w-20 text-right text-[13px] leading-[18px] tabular-nums ${overdue ? "font-medium text-warning" : "text-ink-muted"}`}
      >
        <span className="sr-only">Submitted </span>
        {ageLabel(ageMs)}
      </span>
      <Decisions g={g} filter={filter} />
    </li>
  );
}

function Detail({ g, filter, nowMs }: { g: PendingGroup; filter: Filter; nowMs: number }) {
  const ageMs = nowMs - new Date(g.created_at).getTime();
  const overdue = ageMs >= DAY_MS;
  return (
    <aside
      id="detail"
      aria-label="Request details"
      className="scroll-mt-6 overflow-hidden rounded-card-mobile border border-line bg-surface lg:sticky lg:top-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-6 py-4 text-[13px] leading-[18px] text-ink-muted">
        <span>Submitted {formatSubmitted(g.created_at)}</span>
        <span className={overdue ? "font-medium text-warning" : undefined}>{ageLabel(ageMs)}</span>
      </div>
      <div className="flex flex-col gap-5 px-6 pb-6 pt-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl leading-7 [overflow-wrap:anywhere]">{g.name}</h2>
          <span className="text-[13px] leading-[18px] [overflow-wrap:anywhere]">
            <span className="sr-only">Email: </span>
            {g.email ? (
              <a
                href={`mailto:${g.email}`}
                className="text-brand-strong underline hover:text-navy motion-safe:transition-[color] motion-safe:duration-300 motion-safe:delay-75"
              >
                {g.email}
              </a>
            ) : (
              "—"
            )}
          </span>
          <span className="text-[13px] leading-[18px] tabular-nums">
            <span className="sr-only">Contact: </span>
            {g.contact || "—"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="font-medium">
              {g.rooms ? `${g.rooms.name} · Floor ${g.rooms.floor}` : "—"}
            </span>
            <span className="tabular-nums">{formatRange(g.hours)}</span>
          </div>
          <Ribbon hours={g.hours} pending large />
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[13px] leading-[18px] text-ink-muted">Date</dt>
            <dd className="mt-0.5 font-medium">{formatDate(g.date)}</dd>
          </div>
          <div>
            <dt className="text-[13px] leading-[18px] text-ink-muted">Attendees</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {g.expected_pax === null ? "—" : g.expected_pax}
            </dd>
          </div>
          <div className="col-span-2 min-w-0">
            <dt className="text-[13px] leading-[18px] text-ink-muted">D-Group leader</dt>
            <dd className="mt-0.5 font-medium [overflow-wrap:anywhere]">{g.dgroup_leader || "—"}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-normal leading-[18px] text-ink-muted">Notes</h3>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{g.notes || "—"}</p>
        </div>
        <div className="pt-1">
          <Decisions g={g} filter={filter} />
        </div>
      </div>
    </aside>
  );
}

export default async function PendingPage({ searchParams }: PageProps<"/admin/pending">) {
  await requireAdmin();

  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const nowMs = new Date().getTime();

  const [{ pending, capped }, notice] = await Promise.all([loadPendingRequests(), loadNotice(sp)]);

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.value, pending.filter((g) => matches(g, f.value, nowMs)).length]),
  ) as Record<Filter, number>;
  const visible = pending.filter((g) => matches(g, filter, nowMs));
  const id = typeof sp.id === "string" ? sp.id : "";
  const selected = visible.find((g) => g.cancel_token === id) ?? visible[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Pending Requests</h1>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          {pending.length === 1
            ? "1 booking waiting for approval"
            : `${pending.length} bookings waiting for approval`}
        </p>
      </div>

      {notice && <ResultToast key={notice.key} notice={notice} />}
      {capped && (
        <p role="status" className="text-warning">
          Showing the oldest {pending.length} requests. Approve or decline these to see the rest.
        </p>
      )}

      <div>
        <Tabs
          label="Filter requests"
          ariaCurrent="true"
          current={filter}
          items={FILTERS.map((f) => ({
            key: f.value,
            label: f.label,
            href: pageHref(f.value),
            count: counts[f.value],
          }))}
        />
      </div>

      {!selected ? (
        <p className="text-ink-muted">
          {pending.length === 0
            ? "No pending requests"
            : "No pending requests match this filter"}
        </p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <ul
            aria-label="Pending requests"
            className="overflow-hidden rounded-card-mobile border border-line bg-surface"
          >
            {visible.map((g) => (
              <Row
                key={g.cancel_token}
                g={g}
                filter={filter}
                selected={g.cancel_token === selected.cancel_token}
                nowMs={nowMs}
              />
            ))}
          </ul>
          <Detail g={selected} filter={filter} nowMs={nowMs} />
        </div>
      )}
    </div>
  );
}

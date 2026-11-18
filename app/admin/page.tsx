import Link from "next/link";
import type { ReactNode } from "react";
import { loadPendingRequests } from "@/lib/admin";
import {
  byFloorThenName,
  CLOSE_HOUR,
  formatMonthDay,
  formatRange,
  groupByToken,
  manilaNow,
  manilaStartOfDay,
  OPEN_HOUR,
  percent,
  startOfMonth,
  startOfNextMonth,
  WEEKDAY_SHORT,
  weekDates,
} from "@/lib/rules";
import { db, requireAdmin, type Booking } from "@/lib/supabase";
import { Ribbon, Status, type StatusKind } from "./parts";

type RoomInfo = { id: number; name: string; floor: number; active: boolean };
type WeekRow = Pick<
  Booking,
  "room_id" | "date" | "hour" | "name" | "dgroup_leader" | "expected_pax" | "cancel_token" | "status"
>;
type MonthRow = Pick<Booking, "hour" | "cancel_token" | "status">;
type PageResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

const PAGE_SIZE = 1000;
const RING_RADIUS = 50;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const ROOM_HOURS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;

const card = "rounded-card-mobile border border-line bg-surface";
const actionBase =
  "inline-flex min-h-11 items-center justify-center rounded-pill border border-transparent px-5 text-sm font-medium motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75";
const subSection =
  "border-t border-line pt-8 md:border-t-0 md:pt-0 xl:border-t xl:pt-8";
const small = "text-[13px] leading-[18px] text-ink-muted";
const th =
  "whitespace-nowrap border-b border-line bg-bg px-4 py-3 text-[13px] font-medium leading-[18px] text-ink-muted first:pl-6 last:pr-6";
const td = "border-b border-line px-4 py-3 align-top first:pl-6 last:pr-6";
const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<PageResult>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return out;
  }
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function Kpi({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-l border-line px-4 py-5 first:border-l-0 max-lg:nth-3:border-l-0 max-lg:nth-[n+3]:border-t sm:px-6">
      <span className="text-ink-muted">{label}</span>
      <span
        className={`text-[32px] font-medium leading-10 tracking-[-0.01em] tabular-nums ${accent ? "text-brand-strong" : "text-ink"}`}
      >
        {value}
      </span>
      <span className={small}>{sub}</span>
    </div>
  );
}

function LegendItem({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-3 rounded-[3px] ${swatch}`} />
      {children}
    </span>
  );
}

function SectionTitle({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id}>{title}</h2>
      {sub && <span className={small}>{sub}</span>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const now = manilaNow();
  const today = now.date;
  const days = weekDates(today);
  const weekStart = days[0];
  const weekEnd = days[6];
  const monthStart = startOfMonth(today);
  const monthEnd = startOfNextMonth(today);

  const pendingResult = await loadPendingRequests();
  const [roomsRes, weekRows, monthRows] = await Promise.all([
    db().from("rooms").select("id, name, floor, active"),
    fetchAll<WeekRow>((from, to) =>
      db()
        .from("bookings")
        .select("room_id, date, hour, name, dgroup_leader, expected_pax, cancel_token, status")
        .eq("kind", "booking")
        .in("status", ["pending", "booked", "cancelled"])
        .gte("date", weekStart)
        .lte("date", weekEnd)
        .order("id")
        .range(from, to),
    ),
    fetchAll<MonthRow>((from, to) =>
      db()
        .from("bookings")
        .select("hour, cancel_token, status")
        .eq("kind", "booking")
        .gte("created_at", manilaStartOfDay(monthStart).toISOString())
        .lt("created_at", manilaStartOfDay(monthEnd).toISOString())
        .order("id")
        .range(from, to),
    ),
  ]);
  if (roomsRes.error) throw new Error(roomsRes.error.message);

  const rooms = (roomsRes.data as RoomInfo[]).sort(byFloorThenName);
  const roomNames = new Map(rooms.map((r) => [r.id, r.name]));
  const activeIds = new Set(rooms.filter((r) => r.active).map((r) => r.id));

  const weekGroups = groupByToken(weekRows);
  const live = weekGroups.filter((g) => g.status === "booked" || g.status === "pending");
  const cancelledThisWeek = weekGroups.filter((g) => g.status === "cancelled").length;

  const perDay = days.map((date, i) => {
    const onDay = live.filter((g) => g.date === date);
    const approved = onDay.filter((g) => g.status === "booked").length;
    const pending = onDay.length - approved;
    return {
      date,
      label: WEEKDAY_SHORT[i],
      isToday: date === today,
      approved,
      pending,
      total: onDay.length,
    };
  });
  const weekTotal = perDay.reduce((sum, d) => sum + d.total, 0);
  const maxDay = Math.max(1, ...perDay.map((d) => d.total));
  const todayStats = perDay.find((d) => d.isToday) ?? perDay[0];

  const todayGroups = live
    .filter((g) => g.date === today)
    .sort(
      (a, b) =>
        a.hours[0] - b.hours[0] ||
        (roomNames.get(a.room_id) ?? "").localeCompare(roomNames.get(b.room_id) ?? "", undefined, {
          numeric: true,
        }),
    );

  const activeCount = activeIds.size;
  const capacity = activeCount * ROOM_HOURS_PER_DAY;
  const bookedHours = todayGroups
    .filter((g) => activeIds.has(g.room_id))
    .reduce((sum, g) => sum + g.hours.length, 0);
  const usePct = Math.min(100, percent(bookedHours, capacity));
  const inUseNow = new Set(
    todayGroups
      .filter((g) => g.status === "booked" && activeIds.has(g.room_id) && g.hours.includes(now.hour))
      .map((g) => g.room_id),
  ).size;

  const monthGroups = groupByToken(monthRows);
  const monthCount = (status: string) => monthGroups.filter((g) => g.status === status).length;
  const monthTotal = monthGroups.length;
  const statusRows: { kind: StatusKind; count: number; swatch: string }[] = [
    { kind: "approved", count: monthCount("booked"), swatch: "bg-brand-strong" },
    { kind: "pending", count: monthCount("pending"), swatch: "bg-sky" },
    { kind: "declined", count: monthCount("declined"), swatch: "bg-danger" },
    { kind: "cancelled", count: monthCount("cancelled"), swatch: "bg-outline" },
    { kind: "expired", count: monthCount("expired"), swatch: "bg-outline" },
  ];

  const hoursByRoom = new Map<number, number>();
  for (const g of live) {
    hoursByRoom.set(g.room_id, (hoursByRoom.get(g.room_id) ?? 0) + g.hours.length);
  }
  const busiest = [...hoursByRoom.entries()]
    .map(([id, hours]) => ({ id, name: roomNames.get(id) ?? "Unknown room", hours }))
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, undefined, { numeric: true }))
    .slice(0, 4);
  const topHours = busiest[0]?.hours ?? 1;

  const { pending, capped } = pendingResult;
  const pendingLabel = capped ? "1000+" : String(pending.length);
  const hasPending = pending.length > 0;
  const nowMs = new Date().getTime();
  const over24 = pending.filter((g) => nowMs - new Date(g.created_at).getTime() >= DAY_MS).length;
  const weekRange = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`;

  const chartLabel = `Bookings per day this week. ${perDay
    .map((d) => `${d.label} ${d.total}, ${d.approved} approved and ${d.pending} pending`)
    .join("; ")}.`;
  const ringLabel = `${usePct} percent of room hours booked today`;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1>Welcome, Admin</h1>
            <p className="text-[15px] leading-[22px] text-ink-muted">
              Here&apos;s what&apos;s happening in the rooms today
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/calendar"
              className={`${actionBase} border-outline-soft bg-surface text-ink hover:border-brand hover:bg-brand-soft`}
            >
              Block a slot
            </Link>
            {hasPending ? (
              <Link
                href="/admin/pending"
                className={`${actionBase} bg-brand-strong text-surface hover:bg-navy`}
              >
                Review {pendingLabel} {plural(pending.length, "request", "requests")}
              </Link>
            ) : null}
          </div>
        </div>

        <section aria-label="Key figures" className={`${card} grid grid-cols-2 overflow-hidden lg:grid-cols-4`}>
          <Kpi
            label="Bookings today"
            value={String(todayStats.total)}
            sub={`${todayStats.approved} approved, ${todayStats.pending} pending`}
          />
          <Kpi
            label="Pending requests"
            value={pendingLabel}
            sub={over24 === 0 ? "None waiting over 24 hrs" : `${over24} waiting over 24 hrs`}
            accent
          />
          <Kpi label="Bookings this week" value={String(weekTotal)} sub={weekRange} />
          <Kpi label="Cancelled this week" value={String(cancelledThisWeek)} sub={weekRange} />
        </section>

        <section aria-labelledby="week-heading" className={`${card} flex flex-col gap-6 p-5 md:px-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle id="week-heading" title="Bookings this week" sub={weekRange} />
            <div className={`flex flex-wrap gap-4 ${small}`}>
              <LegendItem swatch="bg-brand-tint">Approved</LegendItem>
              <LegendItem swatch="bg-sky">Pending</LegendItem>
            </div>
          </div>
          <div role="img" aria-label={chartLabel}>
            <div className="grid h-52 grid-cols-7 items-end gap-2 border-b border-line bg-[linear-gradient(var(--color-line)_1px,transparent_1px)] bg-[length:100%_52px] px-1 pt-7 sm:gap-4">
              {perDay.map((d) => (
                <div key={d.date} className="flex h-full flex-col justify-end">
                  <div
                    className="relative mx-auto w-full max-w-11"
                    style={{ height: `${(d.total / maxDay) * 100}%` }}
                  >
                    <span
                      className={`absolute inset-x-0 -top-6 text-center text-[13px] leading-[18px] tabular-nums ${
                        d.isToday ? "font-medium text-ink" : "text-ink-muted"
                      }`}
                    >
                      {d.total}
                    </span>
                    <div className="flex h-full flex-col gap-0.5 overflow-hidden rounded-t-lg rounded-b-sm">
                      {d.pending > 0 && (
                        <div className="bg-sky" style={{ flexGrow: d.pending }} />
                      )}
                      {d.approved > 0 && (
                        <div
                          className={d.isToday ? "bg-brand-strong" : "bg-brand-tint"}
                          style={{ flexGrow: d.approved }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2 px-1 sm:gap-4">
              {perDay.map((d) => (
                <span
                  key={d.date}
                  className={`flex flex-col items-center text-[13px] leading-[18px] ${
                    d.isToday ? "font-medium text-ink" : "text-ink-muted"
                  }`}
                >
                  {d.label}
                  {d.isToday && <span className="text-xs">Today</span>}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="today-heading" className={`${card} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 md:px-6">
            <h2 id="today-heading">Today&apos;s schedule</h2>
            <Link
              href="/admin/list"
              className="inline-flex min-h-11 items-center font-medium text-brand-strong underline underline-offset-[3px] hover:text-navy motion-safe:transition-[color] motion-safe:duration-300 motion-safe:delay-75"
            >
              View all bookings
            </Link>
          </div>
          {todayGroups.length === 0 ? (
            <p className="border-t border-line px-5 py-6 text-ink-muted md:px-6">
              No bookings today
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Time", "Hours", "Room", "Booked by", "Pax", "Status"].map((h) => (
                      <th key={h} scope="col" className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child_td]:border-b-0">
                  {todayGroups.map((g) => (
                    <tr
                      key={g.cancel_token}
                      className="hover:bg-bg motion-safe:transition-[background-color] motion-safe:duration-300 motion-safe:delay-75"
                    >
                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        {formatRange(g.hours)}
                      </td>
                      <td className={`${td} align-middle`}>
                        <Ribbon hours={g.hours} pending={g.status !== "booked"} />
                      </td>
                      <td className={td}>{roomNames.get(g.room_id) ?? "Unknown room"}</td>
                      <td className={`${td} font-medium [overflow-wrap:anywhere]`}>{g.name}</td>
                      <td className={`${td} tabular-nums`}>{g.expected_pax ?? "—"}</td>
                      <td className={td}>
                        <Status kind={g.status === "booked" ? "approved" : "pending"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside
        aria-label="Summary"
        className="grid content-start gap-8 border-t border-line pt-8 md:grid-cols-3 xl:grid-cols-1 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
      >
        <section aria-labelledby="use-heading" className="flex flex-col items-center gap-4">
          <h2 id="use-heading" className="self-start">
            Room use today
          </h2>
          <div className="relative size-40">
            <svg
              viewBox="0 0 120 120"
              role="img"
              aria-label={ringLabel}
              className="size-full"
            >
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="10"
                className="stroke-line"
              />
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(usePct / 100) * RING_LENGTH} ${RING_LENGTH}`}
                transform="rotate(-90 60 60)"
                className="stroke-brand-strong"
              />
            </svg>
            <div
              aria-hidden="true"
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-3xl font-bold text-ink">{usePct}%</span>
              <span className="text-sm text-ink-muted">of room-hours</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-ink">
              {inUseNow} / {activeCount}
            </span>
            <span className="text-sm text-ink-muted">rooms in use now</span>
          </div>
        </section>

        <section aria-labelledby="status-heading" className={`flex flex-col gap-4 ${subSection}`}>
          <SectionTitle
            id="status-heading"
            title="Request status"
            sub={`This month, ${monthTotal} ${plural(monthTotal, "request", "requests")}`}
          />
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-pill bg-mist">
            {statusRows
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.kind} className={s.swatch} style={{ flexGrow: s.count }} />
              ))}
          </div>
          {monthTotal === 0 && <p className="text-sm text-ink-muted">No requests this month yet</p>}
          <ul className="flex flex-col gap-2">
            {statusRows.map((s) => (
              <li key={s.kind} className="flex items-center justify-between gap-3">
                <Status kind={s.kind} />
                <span className="tabular-nums text-ink">
                  <span className="font-medium">{percent(s.count, monthTotal)}%</span>
                  <span className={small}> · {s.count}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="busy-heading" className={`flex flex-col gap-4 ${subSection}`}>
          <SectionTitle id="busy-heading" title="Busiest rooms" sub="This week, booked hours" />
          {busiest.length === 0 ? (
            <p className="text-sm text-ink-muted">No bookings this week yet</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {busiest.map((r, i) => (
                <li key={r.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{r.name}</span>
                    <span className={`flex-none tabular-nums ${small}`}>
                      {r.hours} {plural(r.hours, "hr", "hrs")}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-pill bg-mist">
                    <div
                      className={`h-full rounded-pill ${i === 0 ? "bg-brand-strong" : "bg-outline"}`}
                      style={{ width: `${(r.hours / topHours) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

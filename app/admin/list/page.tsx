import Form from "next/form";
import {
  addDays,
  byFloorThenName,
  formatDate,
  formatRange,
  formatSubmitted,
  groupByToken,
  isRealDate,
  manilaNow,
  MAX_DAYS_AHEAD,
  searchPattern,
} from "@/lib/rules";
import { db, requireAdmin, type Booking } from "@/lib/supabase";
import { expireStaleRequests } from "@/lib/admin";
import DateField from "../date-field";
import { Status, Tabs, type StatusKind } from "../parts";
import RoomSelect from "../room-select";

type Room = { id: number; name: string; floor: number };
type Row = Booking & { rooms: Room | null };
type Status = Booking["status"];

const MAX_GROUPS = 500;
const MAX_ROWS = 1000;
const MAX_SEARCH = 100;

const TABS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "All" },
  { key: "booked", label: "Approved" },
  { key: "pending", label: "Pending" },
  { key: "declined", label: "Declined" },
  { key: "cancelled", label: "Cancelled" },
  { key: "expired", label: "Expired" },
];

const STATUS_KIND: Record<Status, StatusKind> = {
  booked: "approved",
  pending: "pending",
  declined: "declined",
  cancelled: "cancelled",
  expired: "expired",
};

function emailFontSize(email: string): number {
  return Math.max(11, Math.min(13, 13 - (email.length - 22) * 0.25));
}

const field =
  "min-h-11 rounded-pill border border-line bg-surface px-4 text-base font-normal text-ink hover:border-outline motion-safe:transition-[border-color] motion-safe:duration-300 motion-safe:delay-75";
const label = "flex flex-col gap-2 text-[13px] font-medium leading-[18px]";
const td =
  "flex gap-2 break-words before:min-w-24 before:flex-none before:text-[13px] before:font-medium before:leading-[18px] before:text-ink-muted before:content-[attr(data-label)] md:table-cell md:border-b md:border-line md:px-4 md:py-3 md:align-top md:before:hidden md:first:pl-6 md:last:pr-6";
const th =
  "whitespace-nowrap border-b border-line bg-bg px-4 py-3 text-left text-[13px] font-medium leading-[18px] text-ink-muted first:pl-6 last:pr-6";

export default async function BookingsListPage({
  searchParams,
}: PageProps<"/admin/list">) {
  await requireAdmin();
  await expireStaleRequests();

  const today = manilaNow().date;
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const dateOr = (key: string, fallback: string) =>
    isRealDate(one(key)) ? one(key) : fallback;
  const from = dateOr("from", today);
  const to = dateOr("to", addDays(today, MAX_DAYS_AHEAD));
  const q = one("q").trim().slice(0, MAX_SEARCH);
  const roomId = /^\d{1,9}$/.test(one("room")) ? Number(one("room")) : null;
  const statusParam = one("status");
  const active = TABS.find((t) => t.key === statusParam)?.key ?? "all";

  let query = db()
    .from("bookings")
    .select("*, rooms(id, name, floor)")
    .eq("kind", "booking")
    .in("status", ["pending", "booked", "declined", "cancelled", "expired"])
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("room_id")
    .order("hour")
    .limit(MAX_ROWS);
  if (roomId !== null) query = query.eq("room_id", roomId);
  if (q) {
    const p = searchPattern(q);
    query = query.or(`name.ilike.%${p}%,email.ilike.%${p}%,dgroup_leader.ilike.%${p}%`);
  }

  const [{ data, error }, roomsRes] = await Promise.all([
    query,
    db().from("rooms").select("id, name, floor").eq("active", true),
  ]);
  if (error) throw new Error(error.message);
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  const rooms = (roomsRes.data as Room[]).sort(byFloorThenName);

  const rows = data as unknown as Row[];
  const rowCapped = rows.length >= MAX_ROWS;
  let groups = groupByToken(rows);
  if (rowCapped) groups = groups.slice(0, -1);
  const truncated = rowCapped || groups.length > MAX_GROUPS;
  groups = groups.slice(0, MAX_GROUPS);
  groups.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.rooms && b.rooms ? byFloorThenName(a.rooms, b.rooms) : 0) ||
      a.hours[0] - b.hours[0],
  );

  const counts: Record<string, number> = { all: groups.length };
  for (const g of groups) counts[g.status] = (counts[g.status] ?? 0) + 1;
  const shown = active === "all" ? groups : groups.filter((g) => g.status === active);

  function tabHref(key: string): string {
    const params = new URLSearchParams();
    if (isRealDate(one("from"))) params.set("from", from);
    if (isRealDate(one("to"))) params.set("to", to);
    if (roomId !== null) params.set("room", String(roomId));
    if (q) params.set("q", q);
    if (key !== "all") params.set("status", key);
    const s = params.toString();
    return s ? `/admin/list?${s}` : "/admin/list";
  }

  return (
    <div className="flex flex-col gap-6">
      <h1>Booking List</h1>

      <Form action="/admin/list" className="flex flex-wrap items-end gap-3">
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
              maxLength={MAX_SEARCH}
              placeholder="Name, email or leader"
              className={`${field} w-full pl-10`}
            />
          </span>
        </label>
        <label className={label}>
          From
          <DateField name="from" defaultValue={from} className={field} />
        </label>
        <label className={label}>
          To
          <DateField name="to" defaultValue={to} className={field} />
        </label>
        <label className={label}>
          Room
          <RoomSelect
            name="room"
            defaultValue={roomId === null ? "" : String(roomId)}
            options={[
              { value: "", label: "All rooms" },
              ...rooms.map((r) => ({ value: String(r.id), label: `${r.name} (Floor ${r.floor})` })),
            ]}
            className={`${field} min-w-56`}
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-pill bg-brand-strong px-5 text-sm font-medium text-surface hover:bg-navy motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75"
        >
          Filter
        </button>
      </Form>

      <section
        aria-label="Bookings"
        className="overflow-hidden rounded-card-mobile border border-line bg-surface"
      >
        <div className="border-b border-line px-4 py-3">
          <Tabs
            label="Booking status"
            current={active}
            items={TABS.map((t) => ({
              key: t.key,
              label: t.label,
              href: tabHref(t.key),
              count: counts[t.key] ?? 0,
            }))}
          />
        </div>

        {shown.length === 0 ? (
          <p className="p-6 text-ink-muted">No bookings match</p>
        ) : (
          <div className="md:overflow-x-auto">
            <table className="block w-full md:table md:border-collapse">
              <thead className="hidden md:table-header-group">
                <tr>
                  {["Booked by", "D-Group leader", "Contact", "Room", "Date and time", "Pax", "Status", "Booked"].map(
                    (h) => (
                      <th key={h} scope="col" className={th}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="block p-3 md:table-row-group md:p-0 md:[&_tr:last-child_td]:border-b-0">
                {shown.map((g) => {
                  return (
                    <tr
                      key={g.cancel_token}
                      className="mb-3 block rounded-card-mobile border border-line bg-surface p-4 last:mb-0 md:mb-0 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:bg-bg motion-safe:transition-[background-color] motion-safe:duration-300 motion-safe:delay-75"
                    >
                      <td data-label="Booked by" className={`${td} font-medium`}>
                        {g.name}
                      </td>
                      <td data-label="D-Group leader" className={td}>
                        {g.dgroup_leader || "—"}
                      </td>
                      <td data-label="Contact" className={td}>
                        <div className="flex min-w-0 flex-col text-[13px] leading-[18px]">
                          {g.email && (
                            <a
                              href={`mailto:${g.email}`}
                              style={{ fontSize: emailFontSize(g.email) }}
                              className="text-brand-strong underline [overflow-wrap:anywhere] hover:text-navy md:whitespace-nowrap md:[overflow-wrap:normal] motion-safe:transition-[color] motion-safe:duration-300 motion-safe:delay-75"
                            >
                              {g.email}
                            </a>
                          )}
                          {g.contact && <span className="tabular-nums text-ink-muted">{g.contact}</span>}
                        </div>
                      </td>
                      <td data-label="Room" className={td}>
                        {g.rooms && (
                          <>
                            {g.rooms.name}
                            <span className="text-ink-muted"> · Floor {g.rooms.floor}</span>
                          </>
                        )}
                      </td>
                      <td data-label="Date and time" className={`${td} tabular-nums`}>
                        {formatDate(g.date)} · {formatRange(g.hours)}
                      </td>
                      <td data-label="Pax" className={`${td} tabular-nums`}>
                        {g.expected_pax ?? "—"}
                      </td>
                      <td data-label="Status" className={td}>
                        <Status kind={STATUS_KIND[g.status]} />
                      </td>
                      <td data-label="Booked" className={`${td} text-[13px] leading-[18px] tabular-nums text-ink-muted`}>
                        {formatSubmitted(g.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-line px-6 py-3 text-[13px] leading-[18px] text-ink-muted">
          {truncated && (
            <p role="status" className="mb-1 font-semibold text-warning">
              Showing the first {groups.length} bookings. Narrow the filters to see the rest.
            </p>
          )}
          <p>
            Showing {shown.length} of {groups.length} bookings from {formatDate(from)} to{" "}
            {formatDate(to)}
          </p>
        </div>
      </section>
    </div>
  );
}

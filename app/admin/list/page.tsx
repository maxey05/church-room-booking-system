import Form from "next/form";
import Link from "next/link";
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
import DateField from "../date-field";
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
];

const STATUS_PILL: Record<Status, { label: string; className: string }> = {
  booked: { label: "Approved", className: "bg-success/10 text-success" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
  declined: { label: "Declined", className: "bg-danger/10 text-danger" },
  cancelled: { label: "Cancelled", className: "bg-mist text-ink-muted" },
};

const field =
  "min-h-11 rounded-pill border border-line bg-surface px-4 text-base font-normal text-ink hover:border-outline motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75";
const td =
  "flex gap-2 break-words before:min-w-24 before:flex-none before:text-sm before:font-semibold before:text-ink-muted before:content-[attr(data-label)] md:table-cell md:border-b md:border-line md:px-4 md:py-3 md:align-top md:before:hidden";
const th =
  "border-b border-line bg-mist px-4 py-3 text-left text-sm font-semibold text-ink-muted";

export default async function BookingsListPage({
  searchParams,
}: PageProps<"/admin/list">) {
  await requireAdmin();

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
    .in("status", ["pending", "booked", "declined", "cancelled"])
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
    <div>
      <h1>Booking List</h1>

      <Form action="/admin/list" className="mt-6 flex flex-wrap items-end gap-3">
        {active !== "all" && <input type="hidden" name="status" value={active} />}
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold">
          Search
          <span className="relative flex">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
        <label className="flex flex-col gap-1 text-sm font-semibold">
          From
          <DateField name="from" defaultValue={from} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          To
          <DateField name="to" defaultValue={to} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
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
          className="min-h-11 rounded-pill bg-brand-strong px-5 font-semibold text-surface hover:bg-navy motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75"
        >
          Filter
        </button>
      </Form>

      <section
        aria-label="Bookings"
        className="mt-6 overflow-hidden rounded-card-mobile border border-line bg-surface"
      >
        <nav aria-label="Booking status" className="flex flex-wrap gap-2 border-b border-line p-3 md:px-5">
          {TABS.map((t) => {
            const on = t.key === active;
            return (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75 ${
                  on ? "bg-navy text-navy-ink" : "bg-mist text-navy hover:bg-brand-soft"
                }`}
              >
                {t.label}
                <span className={on ? "text-navy-ink/80" : "text-ink-muted"}>
                  {counts[t.key] ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>

        {shown.length === 0 ? (
          <p className="p-5 text-ink-muted">No bookings match.</p>
        ) : (
          <div className="md:overflow-x-auto">
            <table className="block w-full md:table md:border-collapse">
              <thead className="hidden md:table-header-group">
                <tr>
                  {["Booked by", "D-Group leader", "Contact", "Room", "Date & time", "Pax", "Status", "Booked"].map(
                    (h) => (
                      <th key={h} scope="col" className={th}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="block p-3 md:table-row-group md:p-0">
                {shown.map((g) => {
                  const pill = STATUS_PILL[g.status];
                  return (
                    <tr
                      key={g.cancel_token}
                      className="mb-3 block rounded-card-mobile border border-line bg-surface p-4 last:mb-0 md:mb-0 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:bg-brand-soft/40 motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75"
                    >
                      <td data-label="Booked by" className={`${td} font-semibold`}>
                        {g.name}
                      </td>
                      <td data-label="D-Group leader" className={td}>
                        {g.dgroup_leader || "—"}
                      </td>
                      <td data-label="Contact" className={td}>
                        <div className="flex min-w-0 flex-col text-sm">
                          {g.email && (
                            <a
                              href={`mailto:${g.email}`}
                              className="text-brand-strong underline [overflow-wrap:anywhere] hover:text-navy motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75"
                            >
                              {g.email}
                            </a>
                          )}
                          {g.contact && <span className="text-ink-muted">{g.contact}</span>}
                        </div>
                      </td>
                      <td data-label="Room" className={td}>
                        {g.rooms ? `${g.rooms.name} · Floor ${g.rooms.floor}` : ""}
                      </td>
                      <td data-label="Date & time" className={td}>
                        {formatDate(g.date)} · {formatRange(g.hours)}
                      </td>
                      <td data-label="Pax" className={td}>
                        {g.expected_pax ?? "—"}
                      </td>
                      <td data-label="Status" className={td}>
                        <span
                          className={`inline-flex h-fit items-center rounded-pill px-3 py-1 text-sm font-semibold ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                      <td data-label="Booked" className={`${td} text-sm text-ink-muted`}>
                        {formatSubmitted(g.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-line px-5 py-3 text-sm text-ink-muted">
          {truncated && (
            <p role="status" className="mb-1 font-semibold text-warning">
              Showing the first {groups.length} bookings. Narrow the filters to see the rest.
            </p>
          )}
          <p>
            Showing {shown.length} of {groups.length} bookings from {formatDate(from)} to{" "}
            {formatDate(to)}.
          </p>
        </div>
      </section>
    </div>
  );
}

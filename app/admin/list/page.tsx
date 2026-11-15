import {
  addDays,
  byFloorThenName,
  formatDate,
  formatRange,
  groupByToken,
  isRealDate,
  manilaNow,
  MAX_DAYS_AHEAD,
} from "@/lib/rules";
import { db, requireAdmin, type Booking } from "@/lib/supabase";

type Room = { id: number; name: string; floor: number };
type Row = Booking & { rooms: Room | null };

const MAX_GROUPS = 500;
const MAX_ROWS = 1000;

const input =
  "min-h-11 rounded-pill border border-line bg-surface px-4 font-normal text-ink";
const td =
  "flex gap-2 break-words before:min-w-20 before:font-semibold before:text-ink-muted before:content-[attr(data-label)] md:table-cell md:border-b md:border-line md:px-3 md:py-2 md:before:hidden";

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
  const leader = one("leader").trim();
  const roomId = /^\d{1,9}$/.test(one("room")) ? Number(one("room")) : null;

  let query = db()
    .from("bookings")
    .select("*, rooms(id, name, floor)")
    .eq("kind", "booking")
    .eq("status", "booked")
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("room_id")
    .order("hour")
    .limit(MAX_ROWS);
  if (roomId !== null) query = query.eq("room_id", roomId);
  if (leader) {
    query = query.ilike("dgroup_leader", `%${leader.replace(/[\\%_]/g, "\\$&")}%`);
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

  return (
    <div>
      <h1>Bookings</h1>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          From
          <input type="date" name="from" defaultValue={from} className={input} />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          To
          <input type="date" name="to" defaultValue={to} className={input} />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Room
          <select name="room" defaultValue={roomId ?? ""} className={input}>
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Floor {r.floor})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Leader
          <input type="text" name="leader" defaultValue={leader} className={input} />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-pill border border-brand-strong px-4 font-semibold text-brand-strong"
        >
          Filter
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="mt-6 text-ink-muted">No bookings match.</p>
      ) : (
        <>
          {truncated && (
            <p role="status" className="mt-6 font-semibold text-warning">
              Showing the first {groups.length} bookings. Narrow the filters to see the rest.
            </p>
          )}
          <div className="mt-4 md:overflow-x-auto md:rounded-card md:border md:border-line md:bg-surface">
            <table className="block w-full md:table">
              <thead className="hidden md:table-header-group">
                <tr className="text-left">
                  {["Date", "Time", "Room", "Name", "Contact", "Email", "Leader"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {groups.map((g) => (
                  <tr
                    key={g.cancel_token}
                    className="mb-3 block rounded-card-mobile border border-line bg-surface p-4 md:mb-0 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0"
                  >
                    <td data-label="Date" className={td}>
                      {formatDate(g.date)}
                    </td>
                    <td data-label="Time" className={td}>
                      {formatRange(g.hours)}
                    </td>
                    <td data-label="Room" className={td}>
                      {g.rooms ? `${g.rooms.name} (Floor ${g.rooms.floor})` : ""}
                    </td>
                    <td data-label="Name" className={td}>
                      {g.name}
                    </td>
                    <td data-label="Contact" className={td}>
                      {g.contact}
                    </td>
                    <td data-label="Email" className={td}>
                      <a href={`mailto:${g.email}`} className="text-brand-strong underline">
                        {g.email}
                      </a>
                    </td>
                    <td data-label="Leader" className={td}>
                      {g.dgroup_leader}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

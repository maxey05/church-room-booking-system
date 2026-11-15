import Link from "next/link";
import type { ReactNode } from "react";
import {
  addDays,
  byFloorThenName,
  formatDate,
  formatHour,
  groupByToken,
  CLOSE_HOUR,
  HOURS,
  isRealDate,
  manilaNow,
  OPEN_HOUR,
} from "@/lib/rules";
import { db, requireAdmin, type Booking } from "@/lib/supabase";
import { cancelAdmin } from "./actions";
import BlockForm from "./BlockForm";

type Group = Booking & { hours: number[] };

const cell = "border-b border-r border-line p-2 align-top text-sm break-words";
const navLink = "inline-flex min-h-11 items-center text-brand-strong underline";

function BookedCell({ g }: { g: Group }) {
  return (
    <td colSpan={g.hours.length} className={`${cell} bg-brand-soft`}>
      <p className="font-semibold">{g.name}</p>
      <p>{g.contact}</p>
      <p>
        <a href={`mailto:${g.email}`} className="text-brand-strong underline">
          {g.email}
        </a>
      </p>
      {g.dgroup_leader && <p className="text-ink-muted">Leader: {g.dgroup_leader}</p>}
      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-pill border border-danger px-4 font-semibold text-danger">
          Cancel…
        </summary>
        <form action={cancelAdmin.bind(null, g.cancel_token)} className="mt-2">
          <button
            type="submit"
            className="min-h-11 rounded-pill bg-danger px-4 font-semibold text-surface"
          >
            Confirm cancel
          </button>
        </form>
      </details>
    </td>
  );
}

function BlockCell({ g }: { g: Group }) {
  return (
    <td colSpan={g.hours.length} className={`${cell} bg-warning/15`}>
      <p className="font-semibold">Blocked: {g.name}</p>
      <form action={cancelAdmin.bind(null, g.cancel_token)} className="mt-2">
        <button
          type="submit"
          className="min-h-11 rounded-pill border border-danger px-4 font-semibold text-danger"
        >
          Remove block
        </button>
      </form>
    </td>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();

  const today = manilaNow().date;
  const param = (await searchParams).date;
  const date = typeof param === "string" && isRealDate(param) ? param : today;

  const [roomsRes, bookingsRes] = await Promise.all([
    db().from("rooms").select("id, name, floor").eq("active", true),
    db().from("bookings").select("*").eq("date", date).eq("status", "booked"),
  ]);
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  const rooms = (roomsRes.data as { id: number; name: string; floor: number }[]).sort(
    byFloorThenName,
  );
  const groups = groupByToken(bookingsRes.data as Booking[]);
  const starts = new Map(groups.map((g) => [`${g.room_id}-${g.hours[0]}`, g]));
  const blocks = groups.filter((g) => g.kind === "block").length;

  function rowCells(roomId: number): ReactNode[] {
    const cells: ReactNode[] = [];
    let h = OPEN_HOUR;
    while (h < CLOSE_HOUR) {
      const g = starts.get(`${roomId}-${h}`);
      if (g) {
        cells.push(
          g.kind === "block" ? (
            <BlockCell key={h} g={g} />
          ) : (
            <BookedCell key={h} g={g} />
          ),
        );
        h += g.hours.length;
      } else {
        cells.push(<td key={h} className={cell} />);
        h += 1;
      }
    }
    return cells;
  }

  return (
    <div>
      <h1>{formatDate(date)}</h1>
      <p className="mt-1 text-ink-muted">
        {groups.length - blocks} bookings · {blocks} blocks on {formatDate(date)}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Link href={`/admin?date=${addDays(date, -1)}`} className={navLink}>
          ‹ Prev day
        </Link>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-semibold">
            Date
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="min-h-11 rounded-pill border border-line bg-surface px-4 font-normal"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-pill border border-brand-strong px-4 font-semibold text-brand-strong"
          >
            Show
          </button>
        </form>
        <Link href={`/admin?date=${addDays(date, 1)}`} className={navLink}>
          Next day ›
        </Link>
      </div>

      <div className="mt-4 max-w-full overflow-x-auto rounded-card-mobile border border-line bg-surface md:rounded-card">
        <table className="border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-28 border-b border-r border-line bg-surface p-2 text-left"
              >
                Room
              </th>
              {HOURS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="min-w-36 border-b border-r border-line p-2 text-left text-sm font-semibold"
                >
                  {formatHour(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-line bg-surface p-2 text-left align-top font-semibold"
                >
                  {room.name}
                  <span className="block text-sm font-normal text-ink-muted">
                    Floor {room.floor}
                  </span>
                </th>
                {rowCells(room.id)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8">Block time</h2>
      <BlockForm key={date} rooms={rooms} date={date} />
    </div>
  );
}

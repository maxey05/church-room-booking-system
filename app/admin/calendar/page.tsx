import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  byFloorThenName,
  formatDate,
  formatHour,
  formatRange,
  groupByToken,
  hasStarted,
  HOURS,
  isRealDate,
  manilaNow,
} from "@/lib/rules";
import { db, requireAdmin, type Booking } from "@/lib/supabase";
import { cancelAdmin, cancelFromCalendar } from "../actions";
import BlockForm from "../BlockForm";
import DateField from "../date-field";
import CancelButton from "./cancel-button";
import NoticeDialog from "./notice-dialog";

type Group = Booking & { hours: number[] };

const cell = "border-b border-r border-line p-2 align-top text-sm break-words";
const fade = "motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bookedTone = "bg-brand-tint shadow-[inset_4px_0_0_var(--color-brand-strong)]";
const pendingTone = "bg-sky-soft shadow-[inset_4px_0_0_var(--color-sky)]";
const navLink = `inline-flex min-h-11 items-center text-brand-strong underline hover:text-navy ${fade}`;

function BookedCell({ g, cancel }: { g: Group; cancel: ReactNode }) {
  return (
    <td rowSpan={g.hours.length} className={`${cell} relative pr-9 ${bookedTone}`}>
      {cancel}
      <p className="font-semibold">{g.name}</p>
      <p>{g.contact}</p>
      <p>
        <a href={`mailto:${g.email}`} className={`text-brand-strong underline hover:text-navy ${fade}`}>
          {g.email}
        </a>
      </p>
      {g.expected_pax !== null && <p className="text-ink-muted">Pax: {g.expected_pax}</p>}
      {g.dgroup_leader && <p className="text-ink-muted">Leader: {g.dgroup_leader}</p>}
    </td>
  );
}

function PendingCell({ g, cancel }: { g: Group; cancel: ReactNode }) {
  return (
    <td rowSpan={g.hours.length} className={`${cell} relative pr-9 ${pendingTone}`}>
      {cancel}
      <p className="font-semibold">{g.name}</p>
      <p>{g.contact}</p>
      <p>
        <a href={`mailto:${g.email}`} className={`text-brand-strong underline hover:text-navy ${fade}`}>
          {g.email}
        </a>
      </p>
      {g.expected_pax !== null && <p className="text-ink-muted">Pax: {g.expected_pax}</p>}
      {g.dgroup_leader && <p className="text-ink-muted">Leader: {g.dgroup_leader}</p>}
      {!hasStarted(g.date, g.hours[0]) && (
        <Link href="/admin/pending" className={navLink}>
          Review
        </Link>
      )}
    </td>
  );
}

function BlockCell({ g }: { g: Group }) {
  return (
    <td rowSpan={g.hours.length} className={`${cell} bg-warning/15`}>
      <p className="font-semibold">Blocked: {g.name}</p>
      <form action={cancelAdmin.bind(null, g.cancel_token)} className="mt-2">
        <button
          type="submit"
          className={`min-h-11 rounded-pill border border-danger px-4 font-semibold text-danger hover:bg-danger/10 ${fade}`}
        >
          Remove block
        </button>
      </form>
    </td>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["Booked", bookedTone],
    ["Pending", pendingTone],
  ];
  return (
    <ul aria-label="Legend" className="flex min-h-11 items-center gap-4 text-sm">
      {items.map(([label, tone]) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-4 w-6 flex-none rounded-sm border border-line ${tone}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}

async function loadNoticeDialog(
  notice: "cancelled" | "declined",
  token: string,
  sent: boolean,
  closeHref: string,
): Promise<ReactNode> {
  const { data, error } = await db()
    .from("bookings")
    .select("hour, date, name, email, contact, rooms(name)")
    .eq("cancel_token", token)
    .eq("kind", "booking")
    .order("hour");
  if (error) throw new Error(error.message);
  const rows = data as unknown as {
    hour: number;
    date: string;
    name: string;
    email: string | null;
    contact: string | null;
    rooms: { name: string } | null;
  }[];
  const first = rows[0];
  if (!first) return null;
  const email = first.email || "—";
  const contact = first.contact || "—";
  const reach = (
    <>
      <a href={`mailto:${email}`} className="font-semibold text-brand-strong underline">
        {email}
      </a>
      , <span className="font-semibold text-ink">{contact}</span>
    </>
  );
  let message: ReactNode;
  if (notice === "cancelled") {
    message = (
      <p className="text-ink-muted [overflow-wrap:anywhere]">
        The hours are free again. {first.name} was not emailed, so please let them know yourself: {reach}.
      </p>
    );
  } else if (sent) {
    message = (
      <p className="text-ink-muted [overflow-wrap:anywhere]">
        A decline email has been sent to <span className="font-semibold text-ink">{first.name}</span> (
        {email}). The hours are free again.
      </p>
    );
  } else {
    message = (
      <p className="font-semibold text-warning [overflow-wrap:anywhere]">
        The email to {first.name} couldn&apos;t be sent. The hours are free again. Please let them know yourself: {reach}.
      </p>
    );
  }
  return (
    <NoticeDialog
      key={token}
      title={notice === "cancelled" ? "Booking cancelled" : "Reservation declined"}
      rows={[
        ["Name", first.name],
        ["Room", first.rooms?.name ?? "Room"],
        ["Date", formatDate(first.date)],
        ["Time", formatRange(rows.map((r) => r.hour))],
      ]}
      closeHref={closeHref}
    >
      {message}
    </NoticeDialog>
  );
}

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  await requireAdmin();

  const today = manilaNow().date;
  const sp = await searchParams;
  const param = sp.date;
  const date = typeof param === "string" && isRealDate(param) ? param : today;

  const [roomsRes, bookingsRes] = await Promise.all([
    db().from("rooms").select("id, name, floor").eq("active", true),
    db().from("bookings").select("*").eq("date", date).in("status", ["pending", "booked"]),
  ]);
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  const rooms = (roomsRes.data as { id: number; name: string; floor: number }[]).sort(
    byFloorThenName,
  );
  const groups = groupByToken(bookingsRes.data as Booking[]);
  const starts = new Map(groups.map((g) => [`${g.room_id}-${g.hours[0]}`, g]));
  const blocks = groups.filter((g) => g.kind === "block").length;
  const pendingCount = groups.filter((g) => g.kind === "booking" && g.status === "pending").length;

  const coveredUntil = new Map<number, number>();

  const noticeKind = sp.notice;
  const noticeToken = sp.t;
  const noticeDialog =
    (noticeKind === "cancelled" || noticeKind === "declined") &&
    typeof noticeToken === "string" &&
    UUID.test(noticeToken)
      ? await loadNoticeDialog(
          noticeKind,
          noticeToken,
          sp.sent === "1",
          `/admin/calendar?date=${date}`,
        )
      : null;

  function cancelFor(g: Group, roomName: string, isRequest: boolean, allowed: boolean): ReactNode {
    if (!allowed) return null;
    return (
      <CancelButton
        action={cancelFromCalendar.bind(null, g.cancel_token, date)}
        isRequest={isRequest}
        name={g.name}
        room={roomName}
        date={formatDate(g.date)}
        time={formatRange(g.hours)}
      />
    );
  }

  function rowCells(h: number): ReactNode[] {
    const cells: ReactNode[] = [];
    for (const room of rooms) {
      const g = starts.get(`${room.id}-${h}`);
      if (g) {
        coveredUntil.set(room.id, h + g.hours.length);
        cells.push(
          g.kind === "block" ? (
            <BlockCell key={room.id} g={g} />
          ) : g.status === "pending" ? (
            <PendingCell
              key={room.id}
              g={g}
              cancel={cancelFor(g, room.name, true, !hasStarted(g.date, g.hours[0]))}
            />
          ) : (
            <BookedCell
              key={room.id}
              g={g}
              cancel={cancelFor(g, room.name, false, g.date >= today)}
            />
          ),
        );
      } else if ((coveredUntil.get(room.id) ?? 0) > h) {
        continue;
      } else {
        cells.push(<td key={room.id} className={cell} />);
      }
    }
    return cells;
  }

  return (
    <div>
      {noticeDialog}
      <h1>Calendar</h1>
      <p className="mt-1 text-ink-muted">
        {formatDate(date)} · {groups.length - blocks - pendingCount} bookings · {pendingCount} pending
      </p>
      {noticeKind === "stale" && (
        <p role="status" className="mt-2 text-ink-muted">
          That booking was already handled or its time has started, so nothing changed.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Form action="/admin/calendar" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Date
            <DateField
              name="date"
              defaultValue={date}
              className={`min-h-11 rounded-pill border border-line bg-surface px-4 text-base font-normal text-ink hover:border-outline ${fade}`}
            />
          </label>
          <button
            type="submit"
            className={`min-h-11 rounded-pill bg-brand-strong px-5 font-semibold text-surface hover:bg-navy ${fade}`}
          >
            Show
          </button>
        </Form>
        <Legend />
      </div>

      <div className="mt-4 max-h-[70vh] max-w-full overflow-auto rounded-card-mobile border border-line bg-surface">
        <table className="border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 min-w-24 border-b border-r border-line bg-mist p-2 text-left text-sm font-semibold"
              >
                Time
              </th>
              {rooms.map((room) => (
                <th
                  key={room.id}
                  scope="col"
                  className="sticky top-0 z-20 min-w-40 border-b border-r border-line bg-mist p-2 text-left align-top font-semibold"
                >
                  {room.name}
                  <span className="block text-sm font-normal text-ink-muted">
                    Floor {room.floor}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-line bg-surface p-2 text-left align-top text-sm font-semibold"
                >
                  {formatHour(h)}
                </th>
                {rowCells(h)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8">Block time</h2>
      <p className="mt-1 text-ink-muted">
        Block a schedule from any room so that it cannot be scheduled during that time.
      </p>
      <BlockForm key={date} rooms={rooms} date={date} />
    </div>
  );
}

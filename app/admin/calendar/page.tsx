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
import { expireStaleRequests } from "@/lib/admin";
import { db, requireAdmin, type Booking } from "@/lib/supabase";
import { cancelAdmin, cancelFromCalendar } from "../actions";
import BlockForm from "../BlockForm";
import DateField from "../date-field";
import CancelButton from "./cancel-button";
import NoticeDialog from "./notice-dialog";

type Group = Booking & { hours: number[] };

const cellBase = "py-2 pl-3 pr-9 align-top text-[13px] leading-[18px]";
const cell = `border-b border-r border-line ${cellBase}`;
const fade = "motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bookedTone = "bg-brand-tint shadow-[inset_3px_0_0_var(--color-brand-strong)]";
const pendingTone = "border-2 border-dashed border-sky bg-surface shadow-[inset_3px_0_0_var(--color-sky)]";
const blockTone = "bg-warning/15";
const navLink = `inline-flex min-h-11 items-center font-medium text-brand-strong underline hover:text-navy ${fade}`;
const field = `min-h-11 rounded-pill border border-line bg-surface px-4 text-base font-normal text-ink hover:border-outline ${fade}`;

function Details({ g }: { g: Group }) {
  const meta = [
    g.expected_pax !== null ? `${g.expected_pax} pax` : "",
    g.dgroup_leader ? `Leader: ${g.dgroup_leader}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <p className="truncate text-sm font-medium leading-5 text-ink">{g.name}</p>
      {meta && <p className="truncate text-ink-muted">{meta}</p>}
      <p className="truncate tabular-nums text-ink-muted">{g.contact}</p>
      <a
        href={`mailto:${g.email}`}
        className={`block truncate text-ink-muted underline hover:text-navy ${fade}`}
      >
        {g.email}
      </a>
    </>
  );
}

function BookedCell({ g, cancel }: { g: Group; cancel: ReactNode }) {
  return (
    <td rowSpan={g.hours.length} className={`${cell} relative ${bookedTone}`}>
      {cancel}
      <Details g={g} />
    </td>
  );
}

function PendingCell({ g, cancel }: { g: Group; cancel: ReactNode }) {
  return (
    <td rowSpan={g.hours.length} className={`${cellBase} relative ${pendingTone}`}>
      {cancel}
      <Details g={g} />
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
    <td rowSpan={g.hours.length} className={`border-b border-r border-line px-3 py-2 align-top text-[13px] leading-[18px] ${blockTone}`}>
      <p className="truncate text-sm font-medium leading-5 text-ink">Blocked: {g.name}</p>
      <form action={cancelAdmin.bind(null, g.cancel_token)} className="mt-2">
        <button
          type="submit"
          className={`min-h-11 rounded-pill border border-outline-soft bg-surface px-4 text-sm font-medium text-danger hover:border-danger hover:bg-danger/10 ${fade}`}
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
    ["Blocked", blockTone],
  ];
  return (
    <ul aria-label="Legend" className="flex min-h-11 items-center gap-4 text-[13px] leading-[18px]">
      {items.map(([label, tone]) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-4 w-6 flex-none rounded-[3px] ${tone}`} />
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
      <a href={`mailto:${email}`} className="font-medium text-brand-strong underline">
        {email}
      </a>
      , <span className="font-semibold text-ink">{contact}</span>
    </>
  );
  let message: ReactNode;
  if (sent) {
    message = (
      <p className="text-ink-muted [overflow-wrap:anywhere]">
        {notice === "cancelled" ? "A cancellation email" : "A decline email"} has been sent to{" "}
        <span className="font-semibold text-ink">{first.name}</span> ({email}). The hours are free again.
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
  await expireStaleRequests();

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
  const bookingCount = groups.length - blocks - pendingCount;

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
        email={g.email ?? ""}
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
    <div className="flex flex-col gap-6">
      {noticeDialog}
      <div className="flex flex-col gap-1">
        <h1>Calendar</h1>
        <p className="text-[15px] leading-[22px] tabular-nums text-ink-muted">
          {formatDate(date)} · {bookingCount} {bookingCount === 1 ? "booking" : "bookings"} · {pendingCount} pending
        </p>
      </div>
      {noticeKind === "stale" && (
        <p role="status" className="text-ink-muted">
          That booking was already handled or its time has started, so nothing changed.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Form action="/admin/calendar" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2 text-[13px] font-medium leading-[18px]">
            Date
            <DateField name="date" defaultValue={date} className={field} />
          </label>
          <button
            type="submit"
            className={`min-h-11 rounded-pill bg-brand-strong px-5 text-sm font-medium text-surface hover:bg-navy ${fade}`}
          >
            Show
          </button>
        </Form>
        <Legend />
      </div>

      <div className="max-h-[70vh] max-w-full overflow-auto rounded-card-mobile border border-line bg-surface">
        <table
          className="table-fixed border-separate border-spacing-0"
          style={{ width: `calc(6rem + ${rooms.length} * 11rem)` }}
        >
          <colgroup>
            <col className="w-24" />
            {rooms.map((room) => (
              <col key={room.id} className="w-44" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 border-b border-r border-line bg-bg px-3 py-2 text-left text-[13px] font-medium leading-[18px] text-ink-muted"
              >
                Time
              </th>
              {rooms.map((room) => (
                <th
                  key={room.id}
                  scope="col"
                  className="sticky top-0 z-20 border-b border-r border-line bg-bg px-3 py-2 text-left align-top"
                >
                  <span className="block truncate text-sm font-medium leading-5">{room.name}</span>
                  <span className="block text-[13px] font-normal leading-[18px] text-ink-muted">
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
                  className="sticky left-0 z-10 h-14 border-b border-r border-line bg-surface px-3 py-2 text-left align-top text-[13px] font-normal leading-[18px] tabular-nums text-ink-muted"
                >
                  {formatHour(h)}
                </th>
                {rowCells(h)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section
        aria-labelledby="block-heading"
        className="flex flex-col gap-4 rounded-card-mobile border border-line bg-surface px-5 py-5 md:px-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="block-heading">Block time</h2>
          <p className="text-ink-muted">
            Block a schedule from any room so that it cannot be scheduled during that time.
          </p>
        </div>
        <BlockForm key={date} rooms={rooms} date={date} />
      </section>
    </div>
  );
}

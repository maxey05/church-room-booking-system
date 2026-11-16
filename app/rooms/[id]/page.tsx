import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Room } from "@/lib/supabase";
import { addDays, formatDate, manilaNow, MAX_DAYS_AHEAD, resolveDate } from "@/lib/rules";
import RoomPhoto from "../../room-photo";
import BookingForm from "./BookingForm";

export default async function RoomPage({
  params,
  searchParams,
}: PageProps<"/rooms/[id]">) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const { data, error } = await db()
    .from("rooms")
    .select("*")
    .eq("id", Number(id))
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const room = data as Room;

  const today = manilaNow();
  const max = addDays(today.date, MAX_DAYS_AHEAD);
  const date = resolveDate((await searchParams).date, today.date);
  const { data: rows, error: slotsError } = await db()
    .from("bookings")
    .select("hour")
    .eq("room_id", room.id)
    .eq("date", date)
    .eq("status", "booked");
  if (slotsError) throw new Error(slotsError.message);
  const taken = (rows ?? []).map((r) => r.hour as number);
  const pastUntil = date === today.date ? today.hour : -1;

  const facts: [string, string][] = [["Floor", String(room.floor)]];
  if (room.pax != null) facts.push(["Capacity", `${room.pax} pax`]);
  if (room.size_sqm != null) facts.push(["Size", `${room.size_sqm} m²`]);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div>
        <Link
          href={`/rooms?floor=${room.floor}`}
          className="inline-flex min-h-11 items-center text-brand-strong underline"
        >
          ← Floor {room.floor} rooms
        </Link>

        <div className="mt-2 overflow-hidden rounded-card-mobile border border-line bg-surface md:rounded-card">
          <RoomPhoto url={room.photo_url} />
          <div className="p-4 md:p-5">
            <h1>{room.name}</h1>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              {facts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            {room.description && (
              <p className="mt-4">{room.description}</p>
            )}

            {room.amenities.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Amenities">
                {room.amenities.map((a) => (
                  <li
                    key={a}
                    className="rounded-pill bg-brand-tint px-3 py-1 text-sm text-navy"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <h2>{formatDate(date)}</h2>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-semibold">
            Date
            <input
              type="date"
              name="date"
              min={today.date}
              max={max}
              defaultValue={date}
              className="min-h-11 rounded-pill border border-line bg-surface px-4 font-normal"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-pill border border-brand-strong px-4 font-semibold text-brand-strong"
          >
            Show schedule
          </button>
        </form>

        <BookingForm
          key={date}
          roomId={room.id}
          roomName={room.name}
          floor={room.floor}
          date={date}
          taken={taken}
          pastUntil={pastUntil}
        />
      </div>
    </div>
  );
}

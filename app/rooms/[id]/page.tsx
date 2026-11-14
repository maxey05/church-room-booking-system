import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Room } from "@/lib/supabase";
import RoomPhoto from "../../room-photo";

export default async function RoomPage({ params }: PageProps<"/rooms/[id]">) {
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

  const facts: [string, string][] = [["Floor", String(room.floor)]];
  if (room.pax != null) facts.push(["Capacity", `${room.pax} pax`]);
  if (room.size_sqm != null) facts.push(["Size", `${room.size_sqm} m²`]);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div>
        <Link
          href={`/?floor=${room.floor}`}
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
    </div>
  );
}

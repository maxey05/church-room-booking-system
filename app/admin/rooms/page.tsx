import Link from "next/link";
import { getDailyLimit } from "@/lib/bookings";
import { byFloorThenName } from "@/lib/rules";
import { db, requireAdmin } from "@/lib/supabase";
import CapacityCell from "./capacity-cell";
import LimitForm from "./limit-form";

type RoomRow = { id: number; name: string; floor: number; pax: number | null; active: boolean };

const card = "rounded-card-mobile border border-line bg-surface";

export default async function RoomsPage({ searchParams }: PageProps<"/admin/rooms">) {
  await requireAdmin();

  const sp = await searchParams;
  const floorParam = typeof sp.floor === "string" ? sp.floor : "";
  const floor = floorParam === "1" ? 1 : floorParam === "2" ? 2 : null;

  const [limit, { data, error }] = await Promise.all([
    getDailyLimit(),
    db().from("rooms").select("id, name, floor, pax, active"),
  ]);
  if (error) throw new Error(error.message);
  const rooms = (data as RoomRow[]).sort(byFloorThenName);
  const shown = floor === null ? rooms : rooms.filter((r) => r.floor === floor);

  const tabs = [
    { floor: null, label: "All", href: "/admin/rooms", count: rooms.length },
    {
      floor: 1,
      label: "Floor 1",
      href: "/admin/rooms?floor=1",
      count: rooms.filter((r) => r.floor === 1).length,
    },
    {
      floor: 2,
      label: "Floor 2",
      href: "/admin/rooms?floor=2",
      count: rooms.filter((r) => r.floor === 2).length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="tracking-tight">Rooms</h1>

      <section
        aria-labelledby="limit-heading"
        className={`${card} flex flex-wrap items-center justify-between gap-5 px-5 py-5 md:px-6`}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="limit-heading" className="text-lg">
            Daily booking limit
          </h2>
          <p className="text-ink-muted">Max bookings one person can make each day.</p>
        </div>
        <LimitForm current={limit} />
      </section>

      <section aria-labelledby="rooms-heading" className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-6">
          <h2 id="rooms-heading" className="text-lg">
            All rooms
          </h2>
          <nav aria-label="Floor" className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const on = t.floor === floor;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75 ${
                    on ? "bg-navy text-navy-ink" : "bg-mist text-navy hover:bg-brand-soft"
                  }`}
                >
                  {t.label}
                  <span className={on ? "text-navy-ink/80" : "text-ink-muted"}>{t.count}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted md:px-6">No rooms yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="bg-bg text-sm text-ink-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium md:px-6">
                    Room
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Floor
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Capacity
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium md:px-6">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-line has-[[data-editing]]:bg-brand-soft">
                    <td className="px-5 py-1.5 font-semibold [overflow-wrap:anywhere] md:px-6">
                      {r.name}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">{r.floor}</td>
                    <td className="px-3 py-1.5">
                      <CapacityCell roomId={r.id} roomName={r.name} pax={r.pax} />
                    </td>
                    <td className="px-5 py-1.5 md:px-6">
                      <span
                        className={`inline-flex items-center rounded-pill px-3 py-1 text-sm font-semibold ${
                          r.active ? "bg-success/10 text-success" : "bg-mist text-ink-muted"
                        }`}
                      >
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

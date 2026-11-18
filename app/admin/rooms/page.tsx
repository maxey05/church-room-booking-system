import { getDailyLimit } from "@/lib/bookings";
import { byFloorThenName } from "@/lib/rules";
import { db, requireAdmin } from "@/lib/supabase";
import { Status, Tabs } from "../parts";
import CapacityCell from "./capacity-cell";
import LimitForm from "./limit-form";

type RoomRow = { id: number; name: string; floor: number; pax: number | null; active: boolean };

const card = "rounded-card-mobile border border-line bg-surface";
const th =
  "whitespace-nowrap border-b border-line bg-bg px-4 py-3 text-[13px] font-medium leading-[18px] text-ink-muted first:pl-6 last:pr-6";
const td = "border-b border-line px-4 py-2 align-middle first:pl-6 last:pr-6";

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
      <h1>Rooms</h1>

      <section
        aria-labelledby="limit-heading"
        className={`${card} flex flex-wrap items-center justify-between gap-5 px-5 py-5 md:px-6`}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="limit-heading">Daily booking limit</h2>
          <p className="text-ink-muted">Max bookings one person can make each day.</p>
        </div>
        <LimitForm current={limit} />
      </section>

      <section aria-labelledby="rooms-heading" className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 pl-5 pr-4 md:pl-6">
          <h2 id="rooms-heading">All rooms</h2>
          <Tabs
            label="Floor"
            current={String(floor)}
            items={tabs.map((t) => ({
              key: String(t.floor),
              label: t.label,
              href: t.href,
              count: t.count,
            }))}
          />
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted md:px-6">No rooms yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr>
                  {["Room", "Floor", "Capacity", "Status"].map((h) => (
                    <th key={h} scope="col" className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child_td]:border-b-0">
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-bg has-[[data-editing]]:bg-brand-soft motion-safe:transition-[background-color] motion-safe:duration-300 motion-safe:delay-75"
                  >
                    <td className={`${td} font-medium [overflow-wrap:anywhere]`}>{r.name}</td>
                    <td className={`${td} tabular-nums`}>{r.floor}</td>
                    <td className={td}>
                      <CapacityCell roomId={r.id} roomName={r.name} pax={r.pax} />
                    </td>
                    <td className={td}>
                      <Status kind={r.active ? "active" : "inactive"} />
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

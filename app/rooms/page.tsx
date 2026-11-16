import Link from "next/link";
import { db, type Room } from "@/lib/supabase";
import FloorPlan from "../floor-plan";

const FLOORS = [
  { n: 1, name: "First" },
  { n: 2, name: "Second" },
  { n: 3, name: "Third" },
  { n: 4, name: "Fourth" },
  { n: 5, name: "Fifth" },
  { n: 6, name: "Sixth" },
];

export default async function RoomsPage({ searchParams }: PageProps<"/rooms">) {
  const requested = Number((await searchParams).floor);
  const floor = FLOORS.some((f) => f.n === requested) ? requested : 1;

  const { data, error } = await db()
    .from("rooms")
    .select("*")
    .eq("active", true)
    .eq("floor", floor);
  if (error) throw new Error(error.message);
  const rooms = (data as Room[])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="pb-36 lg:flex lg:min-h-[calc(100dvh-9rem)] lg:items-center lg:justify-center lg:pb-0">
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-brand-soft" />

      <h1 className="sr-only">Choose a room</h1>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
        <nav
          aria-label="Floors"
          className="grid grid-cols-6 gap-2 pt-1.5 lg:flex lg:w-[168px] lg:flex-none lg:flex-col-reverse lg:gap-2.5 lg:pt-0"
        >
          {FLOORS.map((f) => {
            const current = f.n === floor;
            return (
              <Link
                key={f.n}
                href={`/rooms?floor=${f.n}`}
                aria-current={current ? "page" : undefined}
                aria-label={`${f.n}F, ${f.name} floor`}
                className={`flex h-[52px] min-w-0 items-center justify-center rounded-[14px] text-[17px] font-bold tracking-wide backdrop-blur-sm backdrop-saturate-150 motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-150 lg:min-h-16 lg:w-[136px] lg:rounded-2xl lg:text-xl ${
                  current
                    ? "-translate-y-1.5 border-[1.5px] border-brand-strong/90 bg-brand-strong/80 text-navy-ink shadow-lg shadow-brand-strong/20 lg:translate-x-4 lg:translate-y-0"
                    : "border border-surface/75 bg-surface/40 text-navy shadow-md shadow-navy/5"
                }`}
              >
                {f.n}F
              </Link>
            );
          })}
        </nav>

        <FloorPlan key={floor} floor={floor} rooms={rooms} />
      </div>
    </div>
  );
}

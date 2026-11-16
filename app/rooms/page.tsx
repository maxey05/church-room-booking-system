import { db } from "@/lib/supabase";
import { byFloorThenName, formatRange, HOURS, manilaNow } from "@/lib/rules";
import Workspace from "./workspace";

type RoomRow = { id: number; name: string; floor: number };

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function RoomsPage({ searchParams }: PageProps<"/rooms">) {
  const params = await searchParams;

  const { data, error } = await db()
    .from("rooms")
    .select("id, name, floor")
    .eq("active", true);
  if (error) throw new Error(error.message);
  const rooms = (data as RoomRow[]).sort(byFloorThenName);

  const requestedRoom = Number(first(params.room));
  const initialRoom = rooms.find((r) => r.id === requestedRoom) ?? null;
  const requestedFloor = Number(first(params.floor));
  const initialFloor =
    initialRoom?.floor ??
    (Number.isInteger(requestedFloor) && requestedFloor >= 1 && requestedFloor <= 6
      ? requestedFloor
      : 1);

  return (
    <div className="pb-28 lg:pb-0">
      <div className="mb-4 flex flex-col items-start gap-3 md:mb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            style={{ animationDelay: "100ms" }}
            className="rise text-[34px] leading-[1.08] font-medium tracking-[-0.035em] text-navy md:text-[40px]"
          >
            Book a room
          </h1>
          <p
            style={{ animationDelay: "200ms" }}
            className="rise mt-1.5 text-base tracking-[-0.01em] text-ink-muted md:text-[17px]"
          >
            Pick a room on the map, then choose a date and your hours.
          </p>
        </div>
        <p
          style={{ animationDelay: "300ms" }}
          className="rise inline-flex flex-none items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-4 text-brand-strong"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Open {formatRange(HOURS)}
        </p>
      </div>

      <Workspace
        rooms={rooms}
        today={manilaNow().date}
        initialFloor={initialFloor}
        initialRoomId={initialRoom?.id ?? null}
      />
    </div>
  );
}

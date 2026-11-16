import { db } from "@/lib/supabase";
import { byFloorThenName, manilaNow } from "@/lib/rules";
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
  const initialRoom =
    rooms.find((r) => r.id === requestedRoom && r.floor >= 1 && r.floor <= 2) ?? null;
  const requestedFloor = Number(first(params.floor));
  const initialFloor =
    initialRoom?.floor ??
    (Number.isInteger(requestedFloor) && requestedFloor >= 1 && requestedFloor <= 2
      ? requestedFloor
      : 1);

  return (
    <div className="pb-28 lg:-mt-2 lg:pb-0">
      <Workspace
        rooms={rooms}
        today={manilaNow().date}
        initialFloor={initialFloor}
        initialRoomId={initialRoom?.id ?? null}
      />
    </div>
  );
}

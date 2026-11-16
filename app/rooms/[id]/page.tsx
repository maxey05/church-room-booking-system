import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";

export default async function RoomPage({ params }: PageProps<"/rooms/[id]">) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const { data, error } = await db()
    .from("rooms")
    .select("id, floor")
    .eq("id", Number(id))
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  redirect(`/rooms?floor=${data.floor}&room=${data.id}`);
}

import { expireStalePending } from "@/lib/bookings";
import { groupByToken, hasStarted, manilaNow } from "@/lib/rules";
import { db, type Booking } from "@/lib/supabase";

export type PendingRow = Booking & { rooms: { name: string; floor: number } | null };
export type PendingGroup = PendingRow & { hours: number[] };

const MAX_PENDING_ROWS = 1000;

export async function expireStaleRequests(): Promise<void> {
  try {
    await expireStalePending();
  } catch (e) {
    console.error("Expiring past requests failed", e);
  }
}

export async function loadPendingRequests(): Promise<{
  pending: PendingGroup[];
  capped: boolean;
}> {
  await expireStaleRequests();
  const today = manilaNow().date;
  const { data, error } = await db()
    .from("bookings")
    .select("*, rooms(name, floor)")
    .eq("kind", "booking")
    .eq("status", "pending")
    .gte("date", today)
    .order("created_at")
    .order("hour")
    .limit(MAX_PENDING_ROWS);
  if (error) throw new Error(error.message);

  const rows = data as unknown as PendingRow[];
  const capped = rows.length >= MAX_PENDING_ROWS;
  let groups = groupByToken(rows);
  if (capped) groups = groups.slice(0, -1);
  const pending = groups
    .filter((g) => !hasStarted(g.date, g.hours[0]))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { pending, capped };
}

export function isMissingEmailLog(error: { code?: string; message: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/email_log/.test(error.message) && /does not exist|schema cache/i.test(error.message))
  );
}

export async function countFailedEmails(): Promise<number> {
  try {
    const { count, error } = await db()
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");
    if (error) {
      if (!isMissingEmailLog(error)) console.error("Counting failed emails failed", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.error("Counting failed emails failed", e);
    return 0;
  }
}

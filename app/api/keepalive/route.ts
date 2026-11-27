import { db } from "@/lib/supabase";

export async function GET() {
  try {
    const { error } = await db().from("rooms").select("id").limit(1);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Keep-alive check failed", (error as { message?: string }).message ?? "unknown error");
    return Response.json({ ok: false }, { status: 500 });
  }
}

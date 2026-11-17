import { requireAdmin } from "@/lib/supabase";
import ComingSoon from "../coming-soon";

export default async function BlockedSlotsPage() {
  await requireAdmin();
  return (
    <ComingSoon
      title="Blocked Slots"
      description="See and remove every blocked time in one list. For now, block time from the Calendar page."
    />
  );
}

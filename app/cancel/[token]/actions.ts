"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelByToken, findBooking } from "@/lib/bookings";
import { manilaNow } from "@/lib/rules";

export async function cancelAction(token: string): Promise<void> {
  const booking = await findBooking(token);
  const cancelled =
    booking && booking.active && booking.date >= manilaNow().date
      ? await cancelByToken(token)
      : 0;
  if (booking && cancelled > 0) revalidatePath(`/rooms/${booking.roomId}`);
  redirect(cancelled > 0 ? `/cancel/${token}?done=1` : `/cancel/${token}`);
}

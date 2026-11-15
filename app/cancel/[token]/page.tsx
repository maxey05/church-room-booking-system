import Link from "next/link";
import type { ReactNode } from "react";
import { findBooking } from "@/lib/bookings";
import { formatDate, formatRange, manilaNow } from "@/lib/rules";
import { cancelAction } from "./actions";

function View({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl rounded-card-mobile border border-line bg-surface p-6 md:rounded-card md:p-10">
      <h1>{title}</h1>
      {children}
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center text-brand-strong underline"
      >
        ← Back to rooms
      </Link>
    </section>
  );
}

export default async function CancelPage({
  params,
  searchParams,
}: PageProps<"/cancel/[token]">) {
  const { token } = await params;
  const { done } = await searchParams;
  const booking = await findBooking(token);

  if (!booking) {
    return (
      <View title="Booking not found">
        <p className="mt-2 text-ink-muted">
          This link is invalid or the booking no longer exists.
        </p>
      </View>
    );
  }

  if (!booking.active && done === "1") {
    return (
      <View title="Booking cancelled">
        <p className="mt-2">The room is free again for others. Thank you!</p>
      </View>
    );
  }

  const details = (
    <div className="mt-4 rounded-card-mobile bg-navy p-4 text-navy-ink md:rounded-card">
      <p className="font-semibold">
        {booking.roomName} (Floor {booking.floor})
      </p>
      <p>
        {formatDate(booking.date)}, {formatRange(booking.hours)}
      </p>
    </div>
  );

  if (!booking.active) {
    return (
      <View title="Already cancelled">
        {details}
      </View>
    );
  }

  if (booking.date < manilaNow().date) {
    return (
      <View title="This booking has already passed">
        {details}
      </View>
    );
  }

  return (
    <View title="Cancel this booking?">
      {details}
      <p className="mt-4">Booked by {booking.name}</p>
      <form action={cancelAction.bind(null, token)} className="mt-4">
        <button
          type="submit"
          className="min-h-12 w-full rounded-pill bg-danger px-6 font-semibold text-surface md:w-auto"
        >
          Cancel booking
        </button>
      </form>
    </View>
  );
}

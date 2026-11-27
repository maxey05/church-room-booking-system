import Link from "next/link";
import type { ReactNode } from "react";
import { findBooking } from "@/lib/bookings";
import { formatDate, formatRange, manilaNow } from "@/lib/rules";
import { cancelAction } from "./actions";
import { CancelButton } from "./cancel-button";

type Tone = "confirm" | "done" | "info" | "past" | "missing";

type Details = {
  roomName: string;
  floor: number;
  date: string;
  hours: number[];
  name: string;
};

const ICONS: Record<Tone, { color: string; paths: string[] }> = {
  confirm: {
    color: "text-danger",
    paths: [
      "M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18V7a2.5 2.5 0 0 1 2.5-2.5z",
      "M3 9.5h18M8 3v3M16 3v3M9.5 13l5 5M14.5 13l-5 5",
    ],
  },
  done: {
    color: "text-success",
    paths: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "M8 12.5l2.7 2.7L16 9.8"],
  },
  info: {
    color: "text-ink-muted",
    paths: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "M12 11v5M12 8v.01"],
  },
  past: {
    color: "text-ink-muted",
    paths: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "M12 7v5l3.5 2"],
  },
  missing: {
    color: "text-ink-muted",
    paths: ["M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z", "M20 20l-4-4M8.5 8.5l5 5M13.5 8.5l-5 5"],
  },
};

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 group-hover:translate-x-[3px] motion-safe:transition-transform motion-safe:duration-300"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function DetailList({ booking }: { booking: Details }) {
  return (
    <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-lg border border-line p-4 text-[15px]">
      <dt className="text-ink-muted">Room</dt>
      <dd className="flex items-center gap-2">
        <span className="inline-block min-w-0 truncate rounded-sm border border-outline bg-surface px-2 py-0.5 text-xs leading-4 font-semibold text-navy">
          {booking.roomName}
        </span>
        <span className="flex-none">Floor {booking.floor}</span>
      </dd>
      <dt className="text-ink-muted">Date</dt>
      <dd>{formatDate(booking.date)}</dd>
      <dt className="text-ink-muted">Time</dt>
      <dd className="tabular-nums">{formatRange(booking.hours)}</dd>
      <dt className="text-ink-muted">Booked by</dt>
      <dd className="[overflow-wrap:anywhere]">{booking.name}</dd>
    </dl>
  );
}

function BookAnother() {
  return (
    <Link
      href="/rooms"
      className="group mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-pill bg-navy px-[18px] text-sm font-semibold text-navy-ink hover:bg-brand-strong hover:shadow-[0_12px_24px_-14px] hover:shadow-brand-strong/80 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-300 motion-safe:delay-75"
    >
      Book another room
      <Arrow />
    </Link>
  );
}

function View({
  tone,
  title,
  booking,
  children,
}: {
  tone: Tone;
  title: string;
  booking?: Details;
  children: ReactNode;
}) {
  const icon = ICONS[tone];
  return (
    <section className="flex min-h-[28rem] items-center justify-center rounded-card-mobile bg-brand-soft px-4 py-10 md:rounded-card md:py-14">
      <div
        role="status"
        className="rise w-full max-w-[440px] rounded-xl bg-surface p-6 md:p-8"
      >
        <h1 className="flex items-center gap-2.5 text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-navy">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-7 flex-none ${icon.color}`}
          >
            {icon.paths.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
          {title}
        </h1>
        {booking ? <DetailList booking={booking} /> : null}
        {children}
      </div>
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
      <View tone="missing" title="Booking not found">
        <p className="mt-4 text-[15px] text-ink-muted">
          This link is invalid or the booking no longer exists. Check the link in your
          email, or contact us below.
        </p>
        <BookAnother />
      </View>
    );
  }

  if (!booking.active && done === "1") {
    return (
      <View tone="done" title="Booking cancelled" booking={booking}>
        <p className="mt-4 text-[15px] text-ink-muted">
          The room is free again for others. Thank you for letting us know!
        </p>
        <BookAnother />
      </View>
    );
  }

  if (!booking.active) {
    return (
      <View tone="info" title="Already cancelled" booking={booking}>
        <p className="mt-4 text-[15px] text-ink-muted">
          This booking was cancelled earlier, so there&apos;s nothing more to do.
        </p>
        <BookAnother />
      </View>
    );
  }

  if (booking.date < manilaNow().date) {
    return (
      <View tone="past" title="This booking has already passed" booking={booking}>
        <p className="mt-4 text-[15px] text-ink-muted">
          Past bookings can&apos;t be cancelled anymore.
        </p>
        <BookAnother />
      </View>
    );
  }

  return (
    <View tone="confirm" title="Cancel this booking?" booking={booking}>
      <p className="mt-4 text-[15px] text-ink-muted">
        The room will be freed for others right away. This can&apos;t be undone.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <form action={cancelAction.bind(null, token)}>
          <CancelButton />
        </form>
        <Link
          href="/rooms"
          className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-[18px] text-sm font-semibold text-ink hover:border-brand hover:bg-brand-soft motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75"
        >
          Keep booking
        </Link>
      </div>
    </View>
  );
}

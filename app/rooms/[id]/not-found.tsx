import Link from "next/link";

export default function RoomNotFound() {
  return (
    <section className="rounded-card-mobile border border-line bg-surface p-6 md:rounded-card md:p-10">
      <h1>Room not found</h1>
      <p className="mt-2 text-ink-muted">
        Sorry, we couldn&apos;t find that room. It may have been removed.
      </p>
      <Link
        href="/rooms"
        className="mt-4 inline-flex min-h-11 items-center text-brand-strong underline hover:text-navy motion-safe:transition-colors motion-safe:duration-250"
      >
        ← Back to all rooms
      </Link>
    </section>
  );
}

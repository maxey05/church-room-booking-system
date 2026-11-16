"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return (
      <main className="grid flex-1 place-items-center bg-brand-soft px-4 py-8 md:px-6">
        {children}
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto grid h-16 w-full max-w-[1120px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[1fr_auto_1fr] md:px-6 lg:px-8">
          <Link
            href="/"
            className="rise flex min-w-0 items-center gap-2.5 justify-self-start"
          >
            <Image
              src="/ccf-icon.png"
              alt=""
              width={512}
              height={512}
              priority
              className="size-9 flex-none rounded-[10px]"
            />
            <span className="truncate text-sm font-semibold text-navy md:text-[15px]">
              CCF Alabang Room Booking
            </span>
          </Link>
          <nav aria-label="Main" className="rise [animation-delay:80ms]">
            <Link
              href="/#how"
              className="relative inline-flex min-h-11 items-center px-1.5 text-sm font-medium text-ink after:absolute after:inset-x-1.5 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-pill after:bg-brand hover:text-ink-muted hover:after:scale-x-100 motion-safe:transition-colors motion-safe:duration-300 motion-safe:delay-75 motion-safe:after:transition-transform motion-safe:after:duration-300 motion-safe:after:delay-75 md:text-[15px]"
            >
              How it works
            </Link>
          </nav>
          <Link
            href="/rooms"
            className="rise hidden min-h-11 items-center justify-self-end rounded-pill bg-navy px-5 text-[15px] font-semibold text-navy-ink [animation-delay:160ms] hover:bg-brand-strong motion-safe:transition-colors motion-safe:duration-300 motion-safe:delay-75 md:inline-flex"
          >
            Book a room
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 md:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}

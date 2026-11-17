"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADDRESS =
  "CCF Building, Prime Street, Madrigal Business Park, Ayala Alabang, Muntinlupa City, 1780 Metro Manila";
const CONTACT_EMAIL = "ccfalabang.booking@gmail.com";
const CONTACT_PHONE = "+63 900 000 0000";
const CONTACT_PHONE_HREF = "tel:+639000000000";

function SiteFooter({ clearFloatingBar }: { clearFloatingBar: boolean }) {
  return (
    <footer
      className={`border-t border-line bg-bg ${clearFloatingBar ? "pb-24 lg:pb-0" : ""}`}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1120px] flex-col justify-center gap-2 px-4 py-3 text-[13px] text-ink-muted md:px-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8 lg:px-8">
        <p className="flex items-start gap-2 xl:items-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-px size-4 flex-none text-brand-strong xl:mt-0"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{ADDRESS}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 xl:flex-none xl:justify-end">
          <span className="font-semibold text-navy">Need help? Contact:</span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-ink underline-offset-4 hover:text-brand-strong hover:underline motion-safe:transition-colors motion-safe:duration-300"
          >
            {CONTACT_EMAIL}
          </a>
          <span aria-hidden="true" className="text-outline">
            |
          </span>
          <a
            href={CONTACT_PHONE_HREF}
            className="font-medium text-ink underline-offset-4 hover:text-brand-strong hover:underline motion-safe:transition-colors motion-safe:duration-300"
          >
            {CONTACT_PHONE}
          </a>
        </p>
      </div>
    </footer>
  );
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return (
      <main className="grid flex-1 place-items-center bg-brand-soft px-4 py-8 md:px-6">
        {children}
      </main>
    );
  }

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
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
      <SiteFooter clearFloatingBar={pathname.startsWith("/rooms")} />
    </>
  );
}

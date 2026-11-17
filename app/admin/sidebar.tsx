"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = {
  href: string;
  label: string;
  icon: string[];
  badge?: number;
  badgeLabel?: string;
  badgeClass?: string;
};

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const link =
  "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-slot px-3 text-sm font-medium hover:bg-sidebar-ink/10 motion-safe:transition-colors motion-safe:duration-150";

export default function AdminSidebar({
  pendingCount,
  failedEmails,
  footer,
}: {
  pendingCount: number;
  failedEmails: number;
  footer: ReactNode;
}) {
  const pathname = usePathname();

  const main: Item[] = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
    },
    {
      href: "/admin/pending",
      label: "Pending Requests",
      icon: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7v5l3 2"],
      badge: pendingCount,
      badgeLabel: "waiting",
      badgeClass: "bg-warning",
    },
    {
      href: "/admin/list",
      label: "Booking List",
      icon: ["M8 6h13", "M8 12h13", "M8 18h13", "M3.5 6h.01", "M3.5 12h.01", "M3.5 18h.01"],
    },
    {
      href: "/admin/calendar",
      label: "Calendar",
      icon: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M3 10h18", "M8 3v4", "M16 3v4"],
    },
  ];

  const manage: Item[] = [
    {
      href: "/admin/rooms",
      label: "Rooms",
      icon: ["M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17", "M2 21h20", "M12 12h.01"],
    },
    {
      href: "/admin/email-log",
      label: "Email Log",
      icon: ["M4 4h16v16H4z", "M4 6l8 7 8-7"],
      badge: failedEmails,
      badgeLabel: "failed",
      badgeClass: "bg-danger",
    },
  ];

  function renderItem(item: Item) {
    const active =
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${link} ${active ? "bg-sidebar-ink/15 text-sidebar-ink" : "text-sidebar-ink/75"}`}
      >
        <Icon paths={item.icon} />
        <span className="flex-1">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className={`rounded-pill ${item.badgeClass} px-2 py-0.5 text-xs font-bold text-navy-ink`}>
            <span className="sr-only">
              {item.badge} {item.badgeLabel}
            </span>
            <span aria-hidden="true">{item.badge}</span>
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="bg-sidebar text-sidebar-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-none lg:flex-col lg:overflow-y-auto">
      <div className="flex items-center gap-2.5 px-4 pt-4 lg:px-5 lg:pt-6">
        <Image
          src="/ccf-icon.png"
          alt=""
          width={512}
          height={512}
          className="size-9 flex-none rounded-[10px]"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold leading-tight">Room Booking</span>
          <span className="text-xs text-sidebar-ink/70">Admin</span>
        </div>
      </div>
      <nav
        aria-label="Admin"
        className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:py-5"
      >
        {main.map(renderItem)}
        <p className="hidden px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-sidebar-ink/60 lg:block">
          Manage
        </p>
        {manage.map(renderItem)}
      </nav>
      <div className="border-t border-sidebar-ink/15 p-3 lg:p-4">{footer}</div>
    </aside>
  );
}

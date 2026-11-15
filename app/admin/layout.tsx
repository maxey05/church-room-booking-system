import type { Metadata } from "next";
import Link from "next/link";
import { getAdmin } from "@/lib/supabase";
import { signOut } from "./login/actions";

export const metadata: Metadata = {
  title: "Admin · CCF Room Booking",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const admin = await getAdmin();

  return (
    <>
      <nav
        aria-label="Admin"
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4"
      >
        <span className="text-lg font-bold text-navy">Admin</span>
        {admin && (
          <>
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline"
            >
              Day view
            </Link>
            <Link
              href="/admin/list"
              className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline"
            >
              Bookings list
            </Link>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <span className="text-ink-muted">{admin.email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="min-h-11 rounded-pill border border-brand-strong px-5 font-semibold text-brand-strong"
                >
                  Logout
                </button>
              </form>
            </div>
          </>
        )}
      </nav>
      {children}
    </>
  );
}

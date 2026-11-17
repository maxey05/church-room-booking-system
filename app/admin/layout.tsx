import type { Metadata } from "next";
import { cookies } from "next/headers";
import { countFailedEmails, loadPendingRequests } from "@/lib/admin";
import { getAdmin } from "@/lib/supabase";
import { signOut } from "./login/actions";
import AdminSidebar from "./sidebar";
import ThemeToggle from "./theme-toggle";

export const metadata: Metadata = {
  title: "Admin · CCF Alabang Room Booking",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const admin = await getAdmin();
  if (!admin) return <>{children}</>;

  const [{ pending }, failedEmails, jar] = await Promise.all([
    loadPendingRequests(),
    countFailedEmails(),
    cookies(),
  ]);
  const theme = jar.get("admin-theme")?.value === "dark" ? "dark" : "light";

  return (
    <div
      data-theme={theme}
      className="admin-shell flex min-h-screen flex-1 flex-col bg-bg text-ink lg:flex-row"
    >
      <AdminSidebar
        pendingCount={pending.length}
        failedEmails={failedEmails}
        footer={
          <div className="flex flex-col gap-2">
            <ThemeToggle initial={theme} />
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 flex-none place-items-center rounded-pill bg-brand-tint text-sm font-semibold text-navy"
              >
                AD
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">Admin</span>
                <span className="truncate text-xs text-sidebar-ink/70">{admin.email}</span>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Log out"
                  className="grid size-11 place-items-center rounded-slot text-sidebar-ink/75 hover:bg-sidebar-ink/10"
                >
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
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        }
      />
      <main className="min-w-0 flex-1 bg-surface px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}

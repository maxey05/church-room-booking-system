import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <section className="rise grid w-full max-w-[960px] overflow-hidden rounded-xl bg-surface shadow-[0_30px_60px_-36px] shadow-navy/45 md:min-h-[560px] md:grid-cols-2">
      <div className="relative grid place-items-center overflow-hidden bg-brand-tint px-6 py-8 md:px-10 md:py-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-52 -left-36 size-[420px] rounded-full bg-surface/30"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full border-2 border-surface/50"
        />
        <div className="relative size-28 rounded-full bg-surface shadow-[0_18px_40px_-20px] shadow-navy/45 md:size-48">
          <Image
            src="/ccf-logo.png"
            alt="CCF"
            width={400}
            height={400}
            priority
            className="size-full rounded-full object-cover"
          />
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-8 md:px-14 md:py-14">
        <h1 className="mb-7">Welcome, Admin</h1>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link
            href="/"
            className="font-semibold text-navy underline decoration-outline-soft underline-offset-4 hover:decoration-navy"
          >
            Back to booking site
          </Link>
        </p>
      </div>
    </section>
  );
}

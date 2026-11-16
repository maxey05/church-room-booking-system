import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCF Alabang Room Booking",
  description: "Book a room for your dgroup at CCF Alabang.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md">
          <div className="mx-auto grid h-16 w-full max-w-[1120px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[1fr_auto_1fr] md:px-6 lg:px-8">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5 justify-self-start"
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
            <nav aria-label="Main">
              <Link
                href="/#how"
                className="relative inline-flex min-h-11 items-center px-1.5 text-sm font-medium text-ink after:absolute after:inset-x-1.5 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-pill after:bg-brand hover:text-navy hover:after:scale-x-100 motion-safe:after:transition-transform motion-safe:after:duration-200 md:text-[15px]"
              >
                How it works
              </Link>
            </nav>
            <Link
              href="/rooms"
              className="hidden min-h-11 items-center justify-self-end rounded-pill bg-navy px-5 text-[15px] font-semibold text-navy-ink hover:bg-ink md:inline-flex"
            >
              Book a room
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 md:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}

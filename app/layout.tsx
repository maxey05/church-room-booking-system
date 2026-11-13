import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCF Room Booking",
  description: "Book a room for your dgroup at CCF Alabang.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[1120px] items-center px-4 py-3 md:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/ccf-logo.png"
                alt=""
                width={544}
                height={562}
                priority
                className="h-10 w-auto md:h-12"
              />
              <span className="text-lg font-semibold text-navy">
                CCF Room Booking
              </span>
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

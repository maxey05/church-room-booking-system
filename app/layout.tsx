import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import RouteProgress from "./route-progress";
import SiteShell from "./site-shell";

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
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}

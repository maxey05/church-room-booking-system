import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HOURS, formatRange } from "@/lib/rules";
import BookingDemo from "./booking-demo";
import { HeroTitle, Reveal } from "./landing-motion";
import { StepConfirm, StepHours, StepRoom } from "./step-demos";

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-75 motion-safe:group-hover:translate-x-0.5"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function StepLabel({ n }: { n: number }) {
  return (
    <span className="inline-flex rounded-pill border border-outline-soft bg-surface/60 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
      Step {n}
    </span>
  );
}

function StepRow({
  n,
  title,
  text,
  flip = false,
  children,
}: {
  n: number;
  title: string;
  text: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <Reveal className="grid items-center gap-3 rounded-card-mobile bg-mist p-3 md:rounded-[28px] md:p-4 lg:grid-cols-2 lg:gap-4">
        <div className={`flex flex-col items-start gap-4 p-4 md:p-6 lg:p-10 ${flip ? "lg:order-2" : ""}`}>
          <StepLabel n={n} />
          <h3 className="text-2xl leading-tight font-semibold tracking-[-0.02em] md:text-[28px]">
            {title}
          </h3>
          <p className="max-w-md text-base text-ink-muted md:text-[17px]">{text}</p>
        </div>
        <div
          aria-hidden="true"
          className="relative h-64 overflow-hidden rounded-[20px] bg-surface md:h-72"
        >
          {children}
        </div>
      </Reveal>
    </li>
  );
}

export default function Home() {
  return (
    <div className="pb-4">
      <section className="pt-2 pb-10 text-center md:pt-10 md:pb-14">
        <HeroTitle className="rise mx-auto max-w-[15ch] text-[40px] leading-[1.08] font-medium tracking-[-0.035em] text-navy md:text-[64px] [animation-delay:100ms]" />
        <p className="rise mx-auto mt-5 max-w-xl text-lg tracking-[-0.01em] text-ink-muted [animation-delay:300ms] md:text-xl">
          Book your D-group meetings in CCF Alabang with ease.
        </p>
        <p className="rise mt-4 inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink [animation-delay:450ms]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-4 text-brand-strong"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Open {formatRange(HOURS)}
        </p>
        <div className="rise mt-8 flex justify-center [animation-delay:600ms]">
          <Link
            href="/rooms"
            className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-pill bg-navy px-7 text-base font-semibold text-navy-ink hover:bg-brand-strong motion-safe:transition-colors motion-safe:duration-300 motion-safe:delay-75 sm:w-auto"
          >
            Book a room
            <Arrow />
          </Link>
        </div>
      </section>

      <BookingDemo />

      <section
        id="how"
        aria-labelledby="how-title"
        className="scroll-mt-20 pt-20 md:pt-28"
      >
        <Reveal className="mx-auto max-w-xl text-center">
          <h2
            id="how-title"
            className="text-4xl leading-tight font-medium tracking-[-0.03em] md:text-[52px]"
          >
            Three steps. <span className="text-brand-strong">That’s it.</span>
          </h2>
          <p className="mt-3.5 text-[17px] text-ink-muted">
            Booking a room takes under two minutes, here’s how to do it:
          </p>
        </Reveal>

        <ol className="mt-10 flex flex-col gap-4 md:mt-12 md:gap-6">
          <StepRow
            n={1}
            title="Pick a room on the map"
            text="Choose a floor, then pick any room in the floor plan."
          >
            <StepRoom />
          </StepRow>

          <StepRow
            n={2}
            flip
            title="Choose your hours"
            text="Pick a date and choose your time."
          >
            <StepHours />
          </StepRow>

          <StepRow
            n={3}
            title="Send your request"
            text="Add your name and contact details. Your booking will be reviewed, and an email will be sent once it is approved."
          >
            <StepConfirm />
          </StepRow>
        </ol>
      </section>

      <Reveal className="flex flex-col items-center px-6 pt-24 pb-16 text-center md:pt-32 md:pb-24">
        <Image
          src="/ccf-icon.png"
          alt=""
          width={512}
          height={512}
          className="size-14 rounded-2xl md:size-16"
        />
        <h2 className="mx-auto mt-6 max-w-[22ch] text-3xl leading-tight font-medium tracking-[-0.03em] text-navy md:text-[40px]">
          Ready for your next <span className="whitespace-nowrap">D-group</span> meeting?
        </h2>
        <Link
          href="/rooms"
          className="group mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-pill bg-navy px-7 text-base font-semibold text-navy-ink hover:bg-brand-strong motion-safe:transition-colors motion-safe:duration-300 motion-safe:delay-75"
        >
          Book a room
          <Arrow />
        </Link>
      </Reveal>
    </div>
  );
}

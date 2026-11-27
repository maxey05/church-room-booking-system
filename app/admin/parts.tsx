import Link from "next/link";
import { CLOSE_HOUR, OPEN_HOUR } from "@/lib/rules";

const OPEN_HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const GRID = { gridTemplateColumns: `repeat(${OPEN_HOURS.length}, minmax(0, 1fr))` };

function hourLabel(h: number): string {
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
}

export function Ribbon({
  hours,
  pending = false,
  large = false,
}: {
  hours: number[];
  pending?: boolean;
  large?: boolean;
}) {
  const fill = pending ? "bg-sky" : "bg-brand-strong";
  const ticks = OPEN_HOURS.map((h) => {
    const on = hours.includes(h);
    if (large) {
      return (
        <i
          key={h}
          className={`h-5 rounded-sm ${on ? fill : "bg-surface ring-1 ring-inset ring-line"}`}
        />
      );
    }
    return <i key={h} className={`rounded-[1px] ${on ? fill : "bg-mist"}`} />;
  });

  if (!large) {
    return (
      <span
        aria-hidden="true"
        style={GRID}
        className="grid h-1.5 w-30 flex-none gap-0.5"
      >
        {ticks}
      </span>
    );
  }

  const marks = [OPEN_HOUR, OPEN_HOUR + 5, OPEN_HOUR + 10, CLOSE_HOUR];
  const first = hours[0];
  const last = hours[hours.length - 1] + 1;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`Holds ${hourLabel(first)} to ${hourLabel(last)}, ${hours.length} of the ${OPEN_HOURS.length} open hours`}
        style={GRID}
        className="grid gap-[3px]"
      >
        {ticks}
      </div>
      <div aria-hidden="true" className="flex justify-between text-[13px] leading-[18px] text-ink-muted">
        {marks.map((h) => (
          <span key={h}>{hourLabel(h)}</span>
        ))}
      </div>
    </div>
  );
}

const STATUS = {
  approved: { label: "Approved", dot: "bg-brand-strong", text: "text-ink" },
  pending: { label: "Pending", dot: "bg-sky", text: "text-ink" },
  declined: { label: "Declined", dot: "bg-danger", text: "text-ink" },
  cancelled: { label: "Cancelled", dot: "bg-outline", text: "text-ink-muted" },
  expired: { label: "Expired", dot: "bg-outline", text: "text-ink-muted" },
  sent: { label: "Sent", dot: "bg-success", text: "text-ink" },
  failed: { label: "Failed", dot: "bg-danger", text: "text-danger" },
  resent: { label: "Resent", dot: "bg-outline", text: "text-ink-muted" },
  active: { label: "Active", dot: "bg-success", text: "text-ink" },
  inactive: { label: "Inactive", dot: "bg-outline", text: "text-ink-muted" },
} as const;

export type StatusKind = keyof typeof STATUS;

export function statusLabel(kind: StatusKind): string {
  return STATUS[kind].label;
}

export function Status({ kind }: { kind: StatusKind }) {
  const s = STATUS[kind];
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium leading-[18px] ${s.text}`}
    >
      <span aria-hidden="true" className={`size-2 flex-none rounded-pill ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Tabs({
  label,
  items,
  current,
  ariaCurrent = "page",
}: {
  label: string;
  items: { key: string; label: string; href: string; count: number }[];
  current: string;
  ariaCurrent?: "page" | "true";
}) {
  return (
    <nav
      aria-label={label}
      className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-pill bg-mist p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((t) => {
        const on = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? ariaCurrent : undefined}
            className={`inline-flex min-h-11 flex-none items-center gap-2 rounded-pill px-4 text-sm font-medium whitespace-nowrap motion-safe:transition-[color,background-color,box-shadow] motion-safe:duration-300 motion-safe:delay-75 ${
              on
                ? "bg-surface text-navy ring-1 ring-line"
                : "text-ink-muted hover:bg-surface/60 hover:text-navy"
            }`}
          >
            {t.label}
            <span className="font-normal tabular-nums text-ink-muted">{t.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

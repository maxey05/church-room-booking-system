"use client";

import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { previewEmail, resendEmail } from "../actions";

export type EmailRow = {
  id: number;
  kind: "approval" | "decline";
  status: "sent" | "failed" | "resent";
  name: string;
  email: string;
  room: string;
  date: string;
  time: string;
  sent: string;
  error: string | null;
};

type Loaded = { id: number; subject: string; body: string } | { id: number; failed: true };

const fade =
  "motion-safe:transition-[color,background-color,border-color,filter] motion-safe:duration-300 motion-safe:delay-75";

const KIND_PILL = {
  approval: { label: "Approval", className: "bg-brand-soft text-brand-strong" },
  decline: { label: "Decline", className: "bg-danger/10 text-danger" },
};

const STATUS_PILL = {
  sent: { label: "Sent", className: "bg-success/10 text-success" },
  failed: { label: "Failed", className: "bg-danger/10 text-danger" },
  resent: { label: "Resent", className: "bg-mist text-ink-muted" },
};

const td =
  "flex gap-2 break-words before:min-w-24 before:flex-none before:text-sm before:font-semibold before:text-ink-muted before:content-[attr(data-label)] md:table-cell md:border-b md:border-line md:px-4 md:py-3 md:align-top md:before:hidden";
const tdActions =
  "flex flex-wrap gap-2 pt-1 md:table-cell md:border-b md:border-line md:px-4 md:py-3 md:pt-3 md:text-right md:align-top";
const th = "border-b border-line bg-mist px-4 py-3 text-left text-sm font-semibold text-ink-muted";
const ghostButton = `min-h-11 whitespace-nowrap rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-brand hover:bg-brand-soft ${fade}`;
const primaryButton = `min-h-11 whitespace-nowrap rounded-pill bg-brand-strong px-4 text-sm font-semibold text-surface hover:bg-navy ${fade}`;
const dialogBase =
  "decline-dialog m-auto w-[calc(100%-2rem)] rounded-card-mobile bg-surface p-0 text-left font-normal text-ink backdrop:bg-scrim/40 backdrop:backdrop-blur-[2px]";

function ConfirmResend() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`min-h-11 rounded-pill bg-brand-strong px-4 text-sm font-semibold text-surface enabled:hover:bg-navy disabled:opacity-60 ${fade}`}
    >
      {pending ? "Resending…" : "Confirm resend"}
    </button>
  );
}

function Details({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-slot bg-mist p-3.5">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="font-semibold [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function EmailTable({
  rows,
  backQuery,
}: {
  rows: EmailRow[];
  backQuery: string;
}) {
  const router = useRouter();
  const viewRef = useRef<HTMLDialogElement>(null);
  const resendRef = useRef<HTMLDialogElement>(null);
  const viewHeading = useId();
  const resendHeading = useId();
  const resendText = useId();
  const [viewRow, setViewRow] = useState<EmailRow | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [resendRow, setResendRow] = useState<EmailRow | null>(null);

  function openView(row: EmailRow) {
    setViewRow(row);
    setLoaded(null);
    viewRef.current?.showModal();
    previewEmail(row.id)
      .then((m) => setLoaded(m ? { id: row.id, ...m } : { id: row.id, failed: true }))
      .catch(() => setLoaded({ id: row.id, failed: true }));
  }

  function openResend(row: EmailRow) {
    setResendRow(row);
    resendRef.current?.showModal();
  }

  async function confirmResend() {
    if (!resendRow) return;
    const next = await resendEmail(resendRow.id, backQuery);
    resendRef.current?.close();
    router.replace(next, { scroll: false });
  }

  const message = viewRow && loaded && loaded.id === viewRow.id ? loaded : null;

  return (
    <>
      <div className="md:overflow-x-auto">
        <table className="block w-full md:table md:border-collapse">
          <thead className="hidden md:table-header-group">
            <tr>
              {["Sent to", "Email", "Booking", "Status", "Sent"].map((h) => (
                <th key={h} scope="col" className={th}>
                  {h}
                </th>
              ))}
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="block p-3 md:table-row-group md:p-0">
            {rows.map((r) => {
              const kind = KIND_PILL[r.kind];
              const status = STATUS_PILL[r.status];
              return (
                <tr
                  key={r.id}
                  className="mb-3 block rounded-card-mobile border border-line bg-surface p-4 last:mb-0 md:mb-0 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:bg-brand-soft/40 motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75"
                >
                  <td data-label="Sent to" className={td}>
                    <div className="flex min-w-0 flex-col md:min-w-52">
                      <span className="font-semibold">{r.name}</span>
                      <a
                        href={`mailto:${r.email}`}
                        className={`text-sm text-brand-strong underline [overflow-wrap:anywhere] hover:text-navy ${fade}`}
                      >
                        {r.email}
                      </a>
                    </div>
                  </td>
                  <td data-label="Email" className={td}>
                    <span
                      className={`inline-flex h-fit items-center rounded-pill px-3 py-1 text-sm font-semibold ${kind.className}`}
                    >
                      {kind.label}
                    </span>
                  </td>
                  <td data-label="Booking" className={td}>
                    <div className="flex min-w-0 flex-col text-sm">
                      <span>{r.room}</span>
                      <span className="text-ink-muted md:whitespace-nowrap">
                        {r.date} · {r.time}
                      </span>
                    </div>
                  </td>
                  <td data-label="Status" className={td}>
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <span
                        className={`inline-flex h-fit items-center rounded-pill px-3 py-1 text-sm font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                      {r.status === "failed" && r.error && (
                        <span className="max-w-56 text-xs text-ink-muted">{r.error}</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Sent" className={`${td} text-sm text-ink-muted md:whitespace-nowrap`}>
                    {r.sent}
                  </td>
                  <td className={tdActions}>
                    <button type="button" onClick={() => openView(r)} className={ghostButton}>
                      View
                    </button>
                    {r.status === "failed" && (
                      <button type="button" onClick={() => openResend(r)} className={primaryButton}>
                        Resend
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dialog
        ref={viewRef}
        aria-labelledby={viewHeading}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className={`${dialogBase} max-w-[34rem]`}
      >
        {viewRow && (
          <div className="flex flex-col gap-4 p-5">
            <h2 id={viewHeading} className="text-lg leading-6">
              Email details
            </h2>
            <div className="flex flex-col gap-3 text-sm leading-6">
              <Details
                rows={[
                  ["To", `${viewRow.name}, ${viewRow.email}`],
                  [
                    "Subject",
                    message && "subject" in message ? message.subject : "Loading…",
                  ],
                  ["Status", STATUS_PILL[viewRow.status].label],
                  ["Sent", viewRow.sent],
                ]}
              />
              {viewRow.error && (
                <p className="rounded-slot bg-danger/10 px-3.5 py-3 font-semibold text-danger">
                  Why it failed: {viewRow.error}
                </p>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Message
              </p>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-slot border border-line p-3.5 text-[13px] leading-[1.35rem]">
                {message === null
                  ? "Loading…"
                  : "body" in message
                    ? message.body
                    : "We couldn't load this message."}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {viewRow.status === "failed" && (
                <button
                  type="button"
                  onClick={() => {
                    viewRef.current?.close();
                    openResend(viewRow);
                  }}
                  className={ghostButton}
                >
                  Resend email
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => viewRef.current?.close()}
                className={`min-h-11 rounded-pill bg-navy px-5 text-sm font-semibold text-navy-ink hover:bg-brand-strong ${fade}`}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={resendRef}
        aria-labelledby={resendHeading}
        aria-describedby={resendText}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className={`${dialogBase} max-w-[26rem]`}
      >
        {resendRow && (
          <div className="flex flex-col gap-4 p-5">
            <h2 id={resendHeading} className="text-lg leading-6">
              Resend this email?
            </h2>
            <div id={resendText} className="flex flex-col gap-3 text-sm leading-6">
              <Details
                rows={[
                  ["Name", resendRow.name],
                  ["Email", resendRow.email],
                  ["Room", resendRow.room],
                  ["Date", resendRow.date],
                  ["Time", resendRow.time],
                ]}
              />
              <p className="text-ink-muted">
                The same {resendRow.kind === "approval" ? "approval" : "decline"} email will be
                sent again.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => resendRef.current?.close()}
                className={ghostButton}
              >
                Keep as is
              </button>
              <form action={confirmResend}>
                <ConfirmResend />
              </form>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

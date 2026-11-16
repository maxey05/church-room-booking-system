import nodemailer from "nodemailer";
import { formatDate, formatRange } from "@/lib/rules";
import { requireEnv } from "@/lib/supabase";

export async function sendConfirmation(b: {
  to: string;
  name: string;
  roomName: string;
  floor: number;
  date: string;
  hours: number[];
  cancelToken: string;
}): Promise<void> {
  const user = requireEnv("GMAIL_USER");
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: requireEnv("GMAIL_APP_PASSWORD") },
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
  });
  const text = [
    `Hi ${b.name},`,
    "",
    "Your room booking is confirmed.",
    "",
    `Room: ${b.roomName} (Floor ${b.floor})`,
    `When: ${formatDate(b.date)}, ${formatRange(b.hours)}`,
    "",
    "Need to cancel? Open this link and press the cancel button:",
    `${requireEnv("SITE_URL")}/cancel/${b.cancelToken}`,
    "",
    "See you there!",
    "CCF Alabang Room Booking",
  ].join("\n");
  await transport.sendMail({
    from: `"CCF Alabang Room Booking" <${user}>`,
    to: b.to,
    subject: `Room reserved: ${b.roomName} — ${formatDate(b.date)}`,
    text,
  });
}

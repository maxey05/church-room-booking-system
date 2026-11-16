import assert from "node:assert/strict";
import {
  CLOSE_HOUR,
  HOURS,
  MAX_DAYS_AHEAD,
  OPEN_HOUR,
  addDays,
  byFloorThenName,
  formatDate,
  formatHour,
  formatRange,
  groupByToken,
  isRealDate,
  manilaNow,
  resolveDate,
  toggleHour,
  validateBlock,
  validateBooking,
  validateFields,
} from "./rules.ts";

function checkDateHelpers(): void {
  assert.deepEqual(manilaNow(new Date("2026-11-13T02:30:00Z")), {
    date: "2026-11-13",
    hour: 10,
  });
  assert.deepEqual(manilaNow(new Date("2026-11-13T16:30:00Z")), {
    date: "2026-11-14",
    hour: 0,
  });
  assert.deepEqual(manilaNow(new Date("2026-11-13T15:59:00Z")), {
    date: "2026-11-13",
    hour: 23,
  });
  assert.equal(typeof manilaNow().date, "string");

  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-11-13", 30), "2026-12-13");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-11-13", 0), "2026-11-13");

  assert.throws(() => addDays("2026-02-30", 1), Error);
  assert.throws(() => addDays("2026-13-01", 1), Error);
  assert.throws(() => addDays("2026-11-1", 1), Error);
  assert.throws(() => addDays("0099-12-31", 1), Error);
  assert.throws(() => addDays("garbage", 1), Error);
  assert.throws(() => addDays("", 1), Error);

  assert.equal(formatDate("2026-11-14"), "Sat, Nov 14");
  assert.equal(formatDate("2026-11-01"), "Sun, Nov 1");
  assert.throws(() => formatDate("2026-02-30"), Error);
  assert.throws(() => formatDate("2026-13-01"), Error);
}

for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo", "Asia/Manila"]) {
  process.env.TZ = zone;
  checkDateHelpers();
}

assert.equal(formatHour(7), "7:00 AM");
assert.equal(formatHour(12), "12:00 PM");
assert.equal(formatHour(21), "9:00 PM");
assert.equal(formatHour(22), "10:00 PM");
assert.equal(formatHour(0), "12:00 AM");
assert.equal(formatHour(24), "12:00 AM");

assert.equal(formatRange([20, 19]), "7:00 PM – 9:00 PM");
assert.equal(formatRange([11]), "11:00 AM – 12:00 PM");
assert.equal(formatRange([23]), "11:00 PM – 12:00 AM");
assert.throws(() => formatRange([]), Error);

assert.equal(OPEN_HOUR, 7);
assert.equal(CLOSE_HOUR, 22);
assert.equal(MAX_DAYS_AHEAD, 30);
assert.equal(HOURS[0], 7);
assert.equal(HOURS.at(-1), 21);
assert.equal(HOURS.length, 15);

const rows = [
  { cancel_token: "a", hour: 10, name: "first" },
  { cancel_token: "a", hour: 9, name: "second" },
  { cancel_token: "b", hour: 9, name: "third" },
];
const grouped = groupByToken(rows);
assert.deepEqual(
  grouped.map((g) => g.hours),
  [[9, 10], [9]],
);
assert.deepEqual(
  grouped.map((g) => g.cancel_token),
  ["a", "b"],
);
assert.equal(grouped[0].name, "first");
assert.deepEqual(groupByToken([]), []);
assert.deepEqual(rows.map((r) => r.hour), [10, 9, 9]);

assert.equal(resolveDate(undefined, "2026-11-14"), "2026-11-14");
assert.equal(resolveDate(["2026-11-15"], "2026-11-14"), "2026-11-14");
assert.equal(resolveDate("junk", "2026-11-14"), "2026-11-14");
assert.equal(resolveDate("2000-01-01", "2026-11-14"), "2026-11-14");
assert.equal(resolveDate("2026-11-13", "2026-11-14"), "2026-11-14");
assert.equal(resolveDate("2026-11-14", "2026-11-14"), "2026-11-14");
assert.equal(resolveDate("2026-11-20", "2026-11-14"), "2026-11-20");
assert.equal(resolveDate("2026-12-14", "2026-11-14"), "2026-12-14");
assert.equal(resolveDate("2026-12-15", "2026-11-14"), "2026-11-14");
assert.equal(resolveDate("2026-02-30", "2026-02-10"), "2026-02-10");

assert.deepEqual(toggleHour([], 9), [9]);
assert.deepEqual(toggleHour([9], 10), [9, 10]);
assert.deepEqual(toggleHour([9, 10], 8), [8, 9, 10]);
assert.deepEqual(toggleHour([9, 10], 12), [12]);
assert.deepEqual(toggleHour([9, 10, 11], 9), [10, 11]);
assert.deepEqual(toggleHour([9, 10, 11], 11), [9, 10]);
assert.deepEqual(toggleHour([9, 10, 11], 10), [10]);
assert.deepEqual(toggleHour([9], 9), []);

const bookingNow = new Date("2026-11-13T02:30:00Z");
const base = {
  name: "Ana Cruz",
  email: "ana@example.com",
  contact: "09171234567",
  dgroupLeader: "",
  consent: true,
  date: "2026-11-14",
  hours: [19, 18],
};
const check = (patch: Partial<typeof base>) =>
  validateBooking({ ...base, ...patch }, bookingNow);

assert.equal(check({}), null);
assert.equal(check({ contact: "+639171234567" }), null);
assert.equal(check({ contact: "0917-123-4567" }), null);
assert.equal(check({ contact: "0917 123 4567" }), null);
assert.equal(check({ name: "   " }), "Please enter your name.");
assert.equal(check({ email: "ana@example" }), "Please enter a valid email address.");
assert.equal(
  check({ contact: "12345" }),
  "Please enter a valid PH mobile number (e.g. 0917 123 4567).",
);
assert.equal(check({ consent: false }), "Please tick the box to continue.");
assert.equal(check({ date: "" }), "Please pick a date.");
assert.equal(check({ date: "2026-02-30" }), "Please pick a date.");
assert.equal(check({ hours: [] }), "Please pick at least one time slot.");
assert.equal(check({ hours: [6] }), "Invalid time slot.");
assert.equal(check({ hours: [22] }), "Invalid time slot.");
assert.equal(check({ hours: [NaN] }), "Invalid time slot.");
assert.equal(
  check({ hours: [9, 11] }),
  "Please pick time slots that are next to each other.",
);
assert.equal(
  check({ hours: [9, 9] }),
  "Please pick time slots that are next to each other.",
);
assert.equal(check({ hours: HOURS }), null);
const windowMessage = "You can book from today up to 30 days ahead.";
assert.equal(check({ date: "2026-11-12" }), windowMessage);
assert.equal(check({ date: "2026-12-14" }), windowMessage);
assert.equal(check({ date: "2026-12-13" }), null);
assert.equal(
  check({ date: "2026-11-13", hours: [10] }),
  "That time slot has already started or passed.",
);
assert.equal(check({ date: "2026-11-13", hours: [11] }), null);
assert.equal(
  check({ name: "", email: "bad", contact: "1", consent: false }),
  "Please enter your name.",
);

const blockBase = { date: "2026-11-14", from: 7, to: 12, label: "Sunday Service" };
const block = (patch: Partial<typeof blockBase>) => validateBlock({ ...blockBase, ...patch });
const hoursMessage = "Pick hours between 7:00 AM and 10:00 PM.";

assert.equal(block({}), null);
assert.equal(block({ from: 21, to: 22 }), null);
assert.equal(block({ from: 7, to: 22 }), null);
assert.equal(block({ date: "2020-01-01" }), null);
assert.equal(block({ label: "  Sunday  " }), null);
assert.equal(block({ label: "x".repeat(80) }), null);
assert.equal(block({ date: "" }), "Please pick a date.");
assert.equal(block({ date: "2026-02-30" }), "Please pick a date.");
assert.equal(block({ from: 10, to: 10 }), "The end hour must be after the start hour.");
assert.equal(block({ from: 12, to: 8 }), "The end hour must be after the start hour.");
assert.equal(block({ to: 23 }), hoursMessage);
assert.equal(block({ from: 6 }), hoursMessage);
assert.equal(block({ from: NaN }), hoursMessage);
assert.equal(block({ to: 9.5 }), hoursMessage);
assert.equal(block({ label: "   " }), "Please enter a label.");
assert.equal(block({ label: "" }), "Please enter a label.");
assert.equal(
  block({ label: "x".repeat(81) }),
  "The label must be 80 characters or fewer.",
);

assert.equal(isRealDate("2026-11-14"), true);
assert.equal(isRealDate("2026-02-30"), false);
assert.equal(isRealDate(""), false);

const sortedRooms = [
  { floor: 2, name: "Room 10" },
  { floor: 2, name: "Room 2" },
  { floor: 1, name: "G5" },
  { floor: 1, name: "G4" },
].sort(byFloorThenName);
assert.deepEqual(
  sortedRooms.map((r) => r.name),
  ["G4", "G5", "Room 2", "Room 10"],
);

assert.deepEqual(
  validateFields({ name: "Ana", email: "ana@example.com", contact: "0917 123 4567", consent: true }),
  {},
);
assert.deepEqual(
  validateFields({ name: " ", email: "nope", contact: "123", consent: false }),
  {
    name: "Please enter your name.",
    email: "Please enter a valid email address.",
    contact: "Please enter a valid PH mobile number (e.g. 0917 123 4567).",
    consent: "Please tick the box to continue.",
  },
);

console.log("lib/rules.test.ts: all checks passed");

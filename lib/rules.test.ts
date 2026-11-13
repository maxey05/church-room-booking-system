import assert from "node:assert/strict";
import {
  CLOSE_HOUR,
  HOURS,
  MAX_DAYS_AHEAD,
  OPEN_HOUR,
  addDays,
  formatDate,
  formatHour,
  formatRange,
  groupByToken,
  manilaNow,
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

console.log("lib/rules.test.ts: all checks passed");

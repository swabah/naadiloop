import assert from "node:assert/strict";
import test from "node:test";
import {
  isStructuredMedicationSchedule,
  localDateFromUtc,
  scheduledDosesForDate,
  scheduledDosesThroughDate,
  suggestedDoseTimes,
} from "./medication-schedule";

test("suggested medication times cover one through four daily doses", () => {
  assert.deepEqual(suggestedDoseTimes[1], ["08:00"]);
  assert.deepEqual(suggestedDoseTimes[2], ["08:00", "20:00"]);
  assert.deepEqual(suggestedDoseTimes[3], ["08:00", "14:00", "20:00"]);
  assert.deepEqual(suggestedDoseTimes[4], ["08:00", "12:00", "16:00", "20:00"]);
});

test("three daily doses expand to morning, afternoon, and night in the device offset", () => {
  const schedule = {
    frequencyPerDay: 3 as const,
    doseTimes: suggestedDoseTimes[3],
    startDate: "2026-07-26",
    durationDays: 2,
  };
  const doses = scheduledDosesForDate(schedule, "2026-07-26", -330);
  assert.deepEqual(
    doses.map((dose) => dose.scheduledFor.toISOString()),
    ["2026-07-26T02:30:00.000Z", "2026-07-26T08:30:00.000Z", "2026-07-26T14:30:00.000Z"],
  );
  assert.equal(localDateFromUtc(doses[2]?.scheduledFor ?? new Date(0), -330), "2026-07-26");
});

test("finite schedules stop after their duration while ongoing schedules continue", () => {
  const finite = {
    frequencyPerDay: 1 as const,
    doseTimes: ["08:00"],
    startDate: "2026-07-26",
    durationDays: 2,
  };
  assert.equal(scheduledDosesThroughDate(finite, "2026-08-10", 0).length, 2);
  assert.equal(
    scheduledDosesThroughDate({ ...finite, durationDays: undefined }, "2026-07-28", 0).length,
    3,
  );
});

test("structured schedules require matching unique times and a start date", () => {
  assert.equal(
    isStructuredMedicationSchedule({
      frequencyPerDay: 2,
      doseTimes: ["08:00", "20:00"],
      startDate: "2026-07-26",
    }),
    true,
  );
  assert.equal(
    isStructuredMedicationSchedule({
      frequencyPerDay: 2,
      doseTimes: ["08:00"],
      startDate: "2026-07-26",
    }),
    false,
  );
});

import { describe, expect, it } from "vitest";
import { formatDueDate, isOverdue, toCalendarDate, validateTask } from "./task";

describe("validateTask", () => {
  it.each([
    { title: "Buy milk", expected: null },
    { title: "", expected: "Enter a title" },
    { title: "   ", expected: "Enter a title" },
  ])("returns $expected for '$title'", ({ title, expected }) => {
    expect(validateTask({ title })).toBe(expected);
  });
});

describe("toCalendarDate", () => {
  it.each([
    { date: new Date(2026, 10, 4, 23, 59), expected: "2026-11-04" },
    { date: new Date(2026, 0, 9, 0, 0), expected: "2026-01-09" },
  ])("writes $date as $expected in local time", ({ date, expected }) => {
    expect(toCalendarDate(date)).toBe(expected);
  });
});

describe("isOverdue", () => {
  const today = "2026-11-04";

  it.each([
    { dueDate: "2026-11-03", completed: false, expected: true },
    { dueDate: "2025-12-31", completed: false, expected: true },
    { dueDate: "2026-11-04", completed: false, expected: false },
    { dueDate: "2026-11-05", completed: false, expected: false },
    { dueDate: "2026-11-03", completed: true, expected: false },
    { dueDate: undefined, completed: false, expected: false },
  ])(
    "returns $expected for due $dueDate with completed $completed",
    ({ dueDate, completed, expected }) => {
      expect(isOverdue({ id: "1", title: "Buy milk", completed, dueDate }, today)).toBe(expected);
    },
  );
});

describe("formatDueDate", () => {
  it.each([
    { dueDate: "2026-11-04", locale: "en-US", expected: "11/4/2026" },
    { dueDate: "2026-11-04", locale: "de-DE", expected: "4.11.2026" },
    { dueDate: "2026-11-04", locale: "fi-FI", expected: "4.11.2026" },
    { dueDate: "0026-11-04", locale: "en-US", expected: "11/4/26" },
  ])("formats $dueDate as $expected in $locale", ({ dueDate, locale, expected }) => {
    expect(formatDueDate(dueDate, locale)).toBe(expected);
  });
});

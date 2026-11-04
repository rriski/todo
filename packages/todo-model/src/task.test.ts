import { describe, expect, it } from "vitest";
import { validateTask } from "./task";

describe("validateTask", () => {
  it.each([
    { title: "Buy milk", expected: null },
    { title: "", expected: "Enter a title" },
    { title: "   ", expected: "Enter a title" },
  ])("returns $expected for '$title'", ({ title, expected }) => {
    expect(validateTask({ title })).toBe(expected);
  });
});

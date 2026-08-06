import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateTime, formatDay, isPast, relativeTime } from "@/lib/format";

afterEach(() => {
  vi.useRealTimers();
});

describe("relativeTime", () => {
  it("phrases the future as 'dans …'", () => {
    expect(relativeTime(new Date(Date.now() + 3 * 86_400_000))).toContain("dans");
  });

  it("phrases the past as 'il y a …'", () => {
    expect(relativeTime(new Date(Date.now() - 3 * 86_400_000))).toContain("il y a");
  });

  it("picks the largest fitting unit", () => {
    expect(relativeTime(new Date(Date.now() + 2 * 3_600_000))).toMatch(/heure/);
    expect(relativeTime(new Date(Date.now() + 5 * 86_400_000))).toMatch(/jour/);
    expect(relativeTime(new Date(Date.now() + 70 * 86_400_000))).toMatch(/mois/);
  });

  it("collapses sub-minute differences", () => {
    expect(relativeTime(new Date(Date.now() + 5_000))).toBe("à l'instant");
  });
});

describe("isPast", () => {
  it("is true strictly before now", () => {
    expect(isPast(new Date(Date.now() - 1000))).toBe(true);
  });

  it("is false for the future", () => {
    expect(isPast(new Date(Date.now() + 1000))).toBe(false);
  });

  it("tracks the clock rather than a captured value", () => {
    vi.useFakeTimers();
    const deadline = new Date(Date.now() + 60_000);
    expect(isPast(deadline)).toBe(false);
    vi.advanceTimersByTime(120_000);
    expect(isPast(deadline)).toBe(true);
  });
});

describe("date formatting", () => {
  const reference = new Date("2026-03-14T09:05:00Z");

  it("renders a short date and time", () => {
    expect(formatDateTime(reference)).toMatch(/14/);
  });

  it("renders a full weekday for calendar headings", () => {
    expect(formatDay(reference)).toMatch(/mars/);
  });
});

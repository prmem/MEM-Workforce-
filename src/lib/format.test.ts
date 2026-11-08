import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatQuantity, formatTaskNumber, istInputToUtcIso, todayIst, utcToIstInputs } from "./format";

describe("formatDate (DD/MM/YYYY, Asia/Kolkata)", () => {
  it("converts UTC to the IST calendar date", () => {
    // 20:00 UTC on 31 Dec = 01:30 IST on 1 Jan
    expect(formatDate("2026-12-31T20:00:00Z")).toBe("01/01/2027");
  });
  it("formats calendar dates without timezone shifting", () => {
    expect(formatDate("2026-04-01")).toBe("01/04/2026");
  });
  it("shows a dash for empty or invalid values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("formatDateTime (12-hour AM/PM, IST)", () => {
  it("formats morning and evening times", () => {
    expect(formatDateTime("2026-11-08T03:30:00Z")).toBe("08/11/2026, 9:00 AM");
    expect(formatDateTime("2026-11-08T13:15:00Z")).toBe("08/11/2026, 6:45 PM");
  });
  it("handles midnight IST", () => {
    expect(formatDateTime("2026-11-07T18:30:00Z")).toBe("08/11/2026, 12:00 AM");
  });
});

describe("IST input conversion", () => {
  it("treats form date/time as IST and stores UTC", () => {
    expect(istInputToUtcIso("2026-11-08", "09:00")).toBe("2026-11-08T03:30:00.000Z");
    expect(istInputToUtcIso("2026-11-09", "02:00")).toBe("2026-11-08T20:30:00.000Z"); // overnight
  });
  it("round-trips back to the same inputs", () => {
    expect(utcToIstInputs(istInputToUtcIso("2026-03-01", "23:59"))).toEqual({ date: "2026-03-01", time: "23:59" });
  });
  it("rejects invalid input", () => {
    expect(() => istInputToUtcIso("08/11/2026", "09:00")).toThrow();
    expect(() => istInputToUtcIso("2026-11-08", "25:00")).toThrow();
  });
  it("computes today in IST", () => {
    expect(todayIst(new Date("2026-11-08T19:00:00Z"))).toBe("2026-11-09");
  });
});

describe("misc formatting", () => {
  it("formats task numbers", () => {
    expect(formatTaskNumber(7)).toBe("T-0007");
    expect(formatTaskNumber(12345)).toBe("T-12345");
  });
  it("formats quantities in Indian grouping", () => {
    expect(formatQuantity(150000, "pcs")).toBe("1,50,000 pcs");
    expect(formatQuantity(null)).toBe("—");
  });
});

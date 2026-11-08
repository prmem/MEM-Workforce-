// All display formatting. Business timezone: Asia/Kolkata (UTC+05:30, no daylight saving).
// Timestamps are stored in UTC (timestamptz) and converted here for display.

export const APP_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Timestamp (UTC) -> "DD/MM/YYYY" in IST. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const m = DATE_ONLY.exec(value);
    // Calendar dates (Postgres `date`) have no timezone: format as-is.
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

/** Timestamp (UTC) -> "DD/MM/YYYY, h:mm AM/PM" in IST. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

/** Form inputs (IST calendar date + "HH:MM") -> UTC ISO timestamp. */
export function istInputToUtcIso(date: string, time: string): string {
  if (!DATE_ONLY.test(date)) throw new Error("Invalid date");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Invalid time");
  const d = new Date(`${date}T${time}:00${IST_OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d.toISOString();
}

/** UTC timestamp -> { date: "YYYY-MM-DD", time: "HH:MM" } in IST, for pre-filling inputs. */
export function utcToIstInputs(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Today's calendar date in IST as "YYYY-MM-DD". */
export function todayIst(now: Date = new Date()): string {
  return utcToIstInputs(now.toISOString()).date;
}

export function formatTaskNumber(n: number): string {
  return `T-${String(n).padStart(4, "0")}`;
}

export function formatQuantity(value: number | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined) return "—";
  const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value);
  return unit ? `${num} ${unit}` : num;
}

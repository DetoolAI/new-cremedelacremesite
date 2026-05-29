// Internal booking page — embeds Setmore inside the website.
export const BOOKING_URL = "/book-now";
export const BOOKING_HELPER = "Book your appointment in seconds";
export const ADMIN_NOTIFICATION_EMAIL = "angie@cremedelacremenails.com";

export const SALON_TZ = "America/New_York";

// Hours: Mon–Sat 10am–7pm, Sun 10am–6pm. 10-minute slots.
export function generateTimeSlots(date: Date): string[] {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  const startHour = 10;
  const endHour = day === 0 ? 18 : 19;
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 10) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export function formatTime12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ---------- Price helpers (shared between client + server) ----------

/** Parse first dollar amount in a price string like "$40", "40.00", "$40+", "$40-$60", "From $40". */
export function parsePriceCents(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isFinite(n) ? Math.round(n * 100) : null;
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------- DST-safe day range in salon timezone ----------

/**
 * Given a UTC instant, returns the offset in minutes such that
 *   localWallClockMs === utcMs + offsetMinutes * 60000
 * for the salon timezone (America/New_York). Handles EST/EDT correctly.
 */
function tzOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let h = get("hour");
  if (h === 24) h = 0;
  const localAsUtcMs = Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"), get("second"));
  return (localAsUtcMs - utcMs) / 60000;
}

/**
 * Convert a local wall-clock time on `date` (YYYY-MM-DD) in the salon TZ
 * to the exact UTC ISO timestamp. Iterates to converge across DST jumps.
 */
function salonLocalToUtcIso(date: string, hh: number, mm: number, ss: number, ms: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const targetLocalMs = Date.UTC(y, m - 1, d, hh, mm, ss, ms);
  // First guess: pretend local == UTC.
  let utcMs = targetLocalMs;
  // Two passes handle DST transitions; third is a safety net.
  for (let i = 0; i < 3; i++) {
    const off = tzOffsetMinutes(utcMs);
    const next = targetLocalMs - off * 60000;
    if (next === utcMs) break;
    utcMs = next;
  }
  return new Date(utcMs).toISOString();
}

/**
 * DST-safe full-day window (in salon TZ) as UTC ISO strings.
 * `start` is local 00:00:00.000, `end` is local 23:59:59.999 on the given date.
 */
export function dayRangeIso(date: string): { start: string; end: string } {
  return {
    start: salonLocalToUtcIso(date, 0, 0, 0, 0),
    end: salonLocalToUtcIso(date, 23, 59, 59, 999),
  };
}

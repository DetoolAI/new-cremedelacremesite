// Canonical tier → benefit allowance map.
// Each benefit has a label and monthly quantity (services per billing period).
// Kept in sync with the tier list in src/routes/membership.tsx.

export type Benefit = { label: string; quantity: number; variants?: string[] };

/**
 * Optional list of specific service options the customer may pick when
 * redeeming a benefit. Keyed by the benefit `label`. When a label is not
 * present here, the benefit redeems as-is (single Redeem button).
 *
 * Edit this map to add / remove / rename what staff sees as choices.
 */
export const BENEFIT_VARIANTS: Record<string, string[]> = {
  "Buff Manicure": ["Buff Manicure", "Buff & Shine Manicure"],
  "Buff Pedicure": ["Buff Pedicure"],
  "Regular Pedicure": ["Regular Pedicure", "Callus Remover Pedicure", "Ingrown Pedicure"],
  "Traditional Manicure": ["Regular Manicure", "Kids Manicure"],
  "Gel Manicure + Gel Soak": ["Gel Manicure + Soak-Off", "Gel Manicure"],
  "Gel Manicure + Soak Off": ["Gel Manicure + Soak-Off", "Gel Manicure"],
  "Gel Pedicure + Gel Soak": ["Color Gel Pedicure & Soak-Off", "Color Gel Pedicure"],
  "Gel Pedicure + Gel Soak Off": ["Color Gel Pedicure & Soak-Off", "Color Gel Pedicure"],
  "Gel Pedicure": ["Color Gel Pedicure", "Color Gel Pedicure & Soak-Off"],
  "Gel Pedi + Gel Soak Off": ["Color Gel Pedicure & Soak-Off"],
  "Gel Pedi + Gel Soak": ["Color Gel Pedicure & Soak-Off"],
  "Premium Spa Gel Pedi + Soak Off": ["Spa Deluxe Premium Gel Pedicure", "Spa Deluxe Pedicure"],
  "Spa Premium Gel Pedi + Soak Off": ["Spa Deluxe Premium Gel Pedicure"],
  "Premium Spa Gel Pedi": ["Spa Deluxe Premium Gel Pedicure"],
  "Russian Manicure": ["Russian Gel Manicure", "Russian Manicure with Rubber Base Overlay"],
  "Russian Gel Manicure": ["Russian Gel Manicure"],
  "Russian Gel Pedicure": ["Russian Spa Deluxe Pedicure", "Russian Dry Pedicure"],
  "Russian Buff Manicure": ["Russian Gel Manicure"],
  "Builder Gel Overlay": ["Russian Manicure with Builder Gel Overlay"],
  "Russian Hardgel Overlay": ["Russian Manicure with Hard or Poly Gel"],
  "Russian Gel-X Extensions": ["Russian Manicure with Gel-X Extensions"],
  "Russian Acrylic Refill": ["Acrylic Refill Russian Manicure + Reg Pedi"],
  "Acrylic Cover Refill": ["Acrylic Refill + Gel Pedi + G Soak", "Acrylic Refill + Reg Pedi"],
  "Protein Gel Mani + Soak Off": ["Protein Gel Manicure + Soak Off", "Protein Gel Manicure"],
};

export function getBenefitVariants(label: string): string[] | undefined {
  return BENEFIT_VARIANTS[label];
}

export const TIER_BENEFITS: Record<string, Benefit[]> = {
  "Regular Pedi Only": [{ label: "Regular Pedicure", quantity: 2 }],
  "Basic — Mani & Pedi": [
    { label: "Traditional Manicure", quantity: 2 },
    { label: "Regular Pedicure", quantity: 2 },
  ],
  "Builder Gel + Gel Pedi": [
    { label: "Builder Gel Overlay", quantity: 1 },
    { label: "Gel Pedi + Gel Soak Off", quantity: 1 },
  ],
  "Gel Mani & Gel Pedi": [
    { label: "Gel Manicure + Gel Soak", quantity: 2 },
    { label: "Gel Pedicure + Gel Soak", quantity: 1 },
  ],
  "2× Builder Gel + Gel Pedi": [
    { label: "Builder Gel Overlay", quantity: 2 },
    { label: "Gel Pedi + Gel Soak", quantity: 1 },
  ],
  "2× Builder Gel + 2× Regular Pedi": [
    { label: "Builder Gel Overlay", quantity: 2 },
    { label: "Regular Pedicure", quantity: 2 },
  ],
  "Russian Gel Mani & Pedi": [
    { label: "Russian Gel Manicure", quantity: 1 },
    { label: "Russian Gel Pedicure", quantity: 1 },
  ],
  "Acrylic Refill + Gel Pedi": [
    { label: "Acrylic Cover Refill", quantity: 2 },
    { label: "Gel Pedicure + Gel Soak Off", quantity: 1 },
  ],
  "Gel Mani + Regular Pedi": [
    { label: "Gel Manicure + Gel Soak", quantity: 2 },
    { label: "Regular Pedicure", quantity: 2 },
  ],
  "Russian Gel-X Extensions + Gel Pedi": [
    { label: "Russian Gel-X Extensions", quantity: 1 },
    { label: "Russian Gel Pedicure", quantity: 1 },
  ],
  "Protein Gel Mani & Spa Gel Pedi": [
    { label: "Protein Gel Mani + Soak Off", quantity: 2 },
    { label: "Spa Premium Gel Pedi + Soak Off", quantity: 1 },
  ],
  "Acrylic Cover Backfill S–M": [{ label: "Acrylic Cover Refill", quantity: 2 }],
  "Russian Hardgel Overlay + Russian Gel Pedi": [
    { label: "Russian Hardgel Overlay", quantity: 1 },
    { label: "Russian Gel Pedicure", quantity: 1 },
  ],
  "Russian Acrylic Refill + Regular Pedi": [
    { label: "Russian Acrylic Refill", quantity: 2 },
    { label: "Regular Pedicure", quantity: 1 },
  ],
  "Russian Mani + Gel Pedi": [
    { label: "Russian Manicure", quantity: 2 },
    { label: "Gel Pedicure", quantity: 1 },
  ],
  "Premium Spa Gel Pedicure + Soak Off": [
    { label: "Premium Spa Gel Pedi + Soak Off", quantity: 1 },
  ],
  "Premium Spa Pedi + Mani Gel": [
    { label: "Premium Spa Gel Pedi + Soak Off", quantity: 1 },
    { label: "Gel Manicure + Soak Off", quantity: 2 },
  ],
  "Premium Gel Mani & Pedi": [
    { label: "Russian Manicure", quantity: 2 },
    { label: "Premium Spa Gel Pedi", quantity: 1 },
  ],
  "Gel Mani + Regular Pedi (Lite)": [
    { label: "Gel Manicure + Gel Soak", quantity: 2 },
    { label: "Regular Pedicure", quantity: 1 },
  ],
  "Buff Manicure Only": [{ label: "Buff Manicure", quantity: 2 }],
  "Russian Buff Manicures": [{ label: "Russian Buff Manicure", quantity: 2 }],
  "Buff Mani & Pedi": [
    { label: "Buff Manicure", quantity: 2 },
    { label: "Buff Pedicure", quantity: 1 },
  ],
  "2× Long Acrylic Refill + Regular Pedi": [
    { label: "Long Acrylic Refill", quantity: 2 },
    { label: "Regular Pedicure", quantity: 1 },
  ],
};

export function getTierBenefits(tierName: string): Benefit[] {
  return TIER_BENEFITS[tierName] ?? [];
}

/**
 * Billing periods reset on the 1st of every calendar month.
 * The current period starts on the most recent 1st-of-month at <= now,
 * unless the member enrolled later in the current month (in which case the
 * period starts on their enrollment date so they aren't credited backwards).
 */
export function currentPeriodStart(enrolledAt: Date | string, now: Date = new Date()): Date {
  const enrolled = typeof enrolledAt === "string" ? new Date(enrolledAt) : enrolledAt;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  // If they enrolled later this same month, start the period at enrollment.
  return enrolled > monthStart ? enrolled : monthStart;
}

export function nextPeriodStart(_enrolledAt: Date | string, now: Date = new Date()): Date {
  // Always the 1st of next month.
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

export function previousPeriodStart(_enrolledAt: Date | string, now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
}

/**
 * Carry-over is disabled. Any unused services at the end of a billing
 * period expire — they do not roll into the next month.
 */
export const MAX_CARRYOVER_PER_BENEFIT = 0;

/**
 * Salon business hours in America/New_York. Redemptions outside this window
 * are blocked by default (staff can still pass `force: true` to override).
 * Tweak these if the salon ever changes hours.
 */
export const BUSINESS_HOURS_TZ = "America/New_York";
export const BUSINESS_HOURS_START = 8; // 8:00 AM
export const BUSINESS_HOURS_END = 22; // 10:00 PM

export function isWithinBusinessHours(now: Date = new Date()): boolean {
  // Convert "now" to NY local hour via Intl
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_HOURS_TZ,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = parseInt(hourStr, 10);
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

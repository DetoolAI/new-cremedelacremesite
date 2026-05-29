/**
 * Square Appointments (Bookings API) sync helpers.
 *
 * Hybrid model: the website is the source of truth for the booking UI, but every
 * confirmed booking is pushed into Square so it shows on Angie's Square calendar.
 *
 * Docs: https://developer.squareup.com/reference/square/bookings-api
 */

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

interface SquareConfig {
  token: string;
  locationId: string;
}

interface SquareTeamMember {
  id: string;
  given_name?: string;
  family_name?: string;
  display_name?: string;
  is_owner?: boolean;
  status?: string;
}

interface SquareCatalogItemVariation {
  id: string;
  type: string;
  version?: number;
  item_variation_data?: {
    name?: string;
    service_duration?: number;
    item_id?: string;
    available_for_booking?: boolean;
  };
}

interface SquareCatalogItem {
  id: string;
  type: string;
  item_data?: { name?: string; product_type?: string };
}

interface SquareBookingProfile {
  team_member_id?: string;
  display_name?: string;
  is_bookable?: boolean;
}

async function squareFetch(
  cfg: SquareConfig,
  path: string,
  init?: RequestInit,
): Promise<any> {
  const res = await fetch(`${SQUARE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      json?.errors?.[0]?.detail ?? `Square API error ${res.status}`;
    throw new Error(detail);
  }
  return json;
}

function normalizeName(s: string | undefined | null): string {
  // Lowercase, strip emojis/punctuation, collapse whitespace.
  return (s ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenSet(s: string): Set<string> {
  const aliases: Record<string, string> = {
    mani: "manicure",
    manis: "manicure",
    pedi: "pedicure",
    pedis: "pedicure",
    reg: "regular",
    spa: "premium",
  };
  return new Set(
    normalizeName(s)
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => aliases[w] ?? w),
  );
}

function tokenSimilarityScore(target: string, candidate: string): number {
  const targetTokens = tokenSet(target);
  const candidateTokens = tokenSet(candidate);
  if (targetTokens.size === 0 || candidateTokens.size === 0) return 0;
  if (targetTokens.has("kid") !== candidateTokens.has("kid")) return 0;
  if (targetTokens.has("kids") !== candidateTokens.has("kids")) return 0;
  let overlap = 0;
  for (const token of targetTokens) if (candidateTokens.has(token)) overlap++;
  if (overlap < targetTokens.size) return 0;
  return overlap * 10 - Math.max(0, candidateTokens.size - targetTokens.size);
}

/**
 * Best-effort E.164 phone normalization for US numbers. Returns null when the
 * input doesn't look like a real phone (Square would reject it otherwise).
 */
function toE164US(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    return null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function phoneDigits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

function customerLooksLikeMatch(
  customer: any,
  wanted: PushBookingArgs["customer"],
): boolean {
  const wantedFirst = normalizeName(wanted.firstName);
  const wantedLast = normalizeName(wanted.lastName);
  const wantedPhone = phoneDigits(wanted.phone);
  const actualFirst = normalizeName(customer?.given_name);
  const actualLast = normalizeName(customer?.family_name);
  const actualDisplay = normalizeName(customer?.nickname ?? customer?.company_name ?? "");
  const actualPhone = phoneDigits(customer?.phone_number);

  const phoneMatches = wantedPhone.length >= 7 && actualPhone.endsWith(wantedPhone.slice(-7));
  const nameMatches =
    (!!wantedFirst && actualFirst === wantedFirst && (!wantedLast || actualLast === wantedLast)) ||
    (!!wantedFirst && !!wantedLast && actualDisplay.includes(`${wantedFirst} ${wantedLast}`));

  return phoneMatches || nameMatches;
}

/**
 * Find a Square team member whose display/full name matches `name`.
 * If `name` is "any available technician" / "any" / empty, returns the first
 * active team member at the location (Square requires a specific team member
 * on every booking segment).
 */
// Only these technicians are real Crème de la Crème Nails staff. Square may
// return other booking profiles (e.g. "Amira") that don't actually work at
// the shop — those must never be selected.
const ALLOWED_TECH_NAMES = ["ana", "johana", "maryy", "mary", "zuly", "angie"];

function isAllowedTech(name: string | null | undefined): boolean {
  const n = normalizeName(name);
  if (!n) return false;
  return ALLOWED_TECH_NAMES.some((a) => n === a || n.startsWith(a + " ") || n.startsWith(a));
}

export async function findTeamMemberByName(
  cfg: SquareConfig,
  name: string,
  preferredIds?: string[],
): Promise<string | null> {
  const target = normalizeName(name);
  const isAny =
    !target || target === "any available technician" || target === "any";

  const profilesJson = await squareFetch(
    cfg,
    `/bookings/team-member-booking-profiles?limit=100`,
  );
  const bookableProfiles: SquareBookingProfile[] =
    (profilesJson?.team_member_booking_profiles ?? []).filter(
      (p: SquareBookingProfile) =>
        p.is_bookable && p.team_member_id && isAllowedTech(p.display_name),
    );

  if (bookableProfiles.length) {
    if (isAny) {
      // Prefer caller-provided list (e.g. techs free at this slot)
      if (preferredIds && preferredIds.length) {
        const match = bookableProfiles.find((p) =>
          preferredIds.includes(p.team_member_id!),
        );
        if (match) return match.team_member_id ?? null;
      }
      return bookableProfiles[0]?.team_member_id ?? null;
    }
    const exact = bookableProfiles.find((p) => normalizeName(p.display_name) === target);
    const startsWith = bookableProfiles.find((p) => normalizeName(p.display_name).startsWith(target));
    const contains = bookableProfiles.find((p) => {
      const dn = normalizeName(p.display_name);
      return dn.includes(target) || target.includes(dn);
    });
    const matched = exact ?? startsWith ?? contains;
    if (matched) return matched.team_member_id ?? null;
    // A specific tech was requested but no name match — do NOT silently
    // fall back to another tech (that caused bookings to be assigned to
    // the wrong person on Square's calendar).
    console.error(
      `findTeamMemberByName: no Square tech matches "${name}". Bookable: ${bookableProfiles
        .map((p) => p.display_name)
        .join(", ")}`,
    );
    return null;
  }

  const json = await squareFetch(cfg, "/team-members/search", {
    method: "POST",
    body: JSON.stringify({
      query: {
        filter: {
          location_ids: [cfg.locationId],
          status: "ACTIVE",
        },
      },
      limit: 200,
    }),
  });
  const members: SquareTeamMember[] = (json?.team_members ?? []).filter(
    (m: SquareTeamMember) =>
      isAllowedTech(m.display_name ?? `${m.given_name ?? ""} ${m.family_name ?? ""}`),
  );

  if (isAny) {
    const nonOwner = members.find((m) => !m.is_owner);
    return (nonOwner ?? members[0])?.id ?? null;
  }

  for (const m of members) {
    const full = normalizeName(
      m.display_name ?? `${m.given_name ?? ""} ${m.family_name ?? ""}`,
    );
    const first = normalizeName(m.given_name);
    if (full === target || first === target || full.startsWith(target)) {
      return m.id;
    }
  }
  return members[0]?.id ?? null;
}

/** Find a Square catalog service variation by its item name. */
export async function findServiceVariationByName(
  cfg: SquareConfig,
  serviceName: string,
): Promise<{ variationId: string; variationVersion: number; durationMinutes: number } | null> {
  const target = normalizeName(serviceName);
  if (!target) return null;

  // Page through the full catalog (Square returns up to 1000 objects per page).
  const items = new Map<string, { name: string; isAppointmentsService: boolean }>();
  const variations: SquareCatalogItemVariation[] = [];
  let cursor: string | undefined = undefined;
  do {
    const qs = new URLSearchParams({ types: "ITEM,ITEM_VARIATION" });
    if (cursor) qs.set("cursor", cursor);
    const json = await squareFetch(cfg, `/catalog/list?${qs.toString()}`);
    const objects: Array<SquareCatalogItem | SquareCatalogItemVariation> =
      json?.objects ?? [];
    for (const o of objects) {
      if (o.type === "ITEM" && (o as SquareCatalogItem).item_data?.name) {
        const item = o as SquareCatalogItem;
        items.set(o.id, {
          name: normalizeName(item.item_data!.name),
          isAppointmentsService: item.item_data?.product_type === "APPOINTMENTS_SERVICE",
        });
      } else if (o.type === "ITEM_VARIATION") {
        variations.push(o as SquareCatalogItemVariation);
      }
    }
    cursor = json?.cursor;
  } while (cursor);

  const build = (v: SquareCatalogItemVariation) => {
    const durationMs = v.item_variation_data?.service_duration ?? 0;
    return {
      variationId: v.id,
      variationVersion: v.version ?? 1,
      durationMinutes: Math.max(15, Math.round(durationMs / 60000)),
    };
  };
  const bookableVariations = variations.filter((v) => {
    const item = items.get(v.item_variation_data?.item_id ?? "");
    return item?.isAppointmentsService && v.item_variation_data?.available_for_booking === true;
  });

  // Matching strategy: try strict matches first so we never mis-route a
  // booking, then fall back to best-fit scoring so every request can sync
  // to Square. Combo↔combo boundary is enforced on every pass — a combo
  // can only match a combo, and a single-service can only match a single
  // service, which prevents the "extensions/overlays" mis-categorization.

  const isCombo = (s: string) => /\bcombos?\b|[&+]/i.test(s);
  const targetIsCombo = isCombo(target);

  // Pass 1: exact match on the Square item (parent) name.
  for (const v of bookableVariations) {
    const parentName = items.get(v.item_variation_data?.item_id ?? "")?.name ?? "";
    if (parentName && parentName === target) return build(v);
  }

  // Pass 2: exact match on the variation name.
  for (const v of bookableVariations) {
    const vName = normalizeName(v.item_variation_data?.name);
    if (vName && vName === target) return build(v);
  }

  // Pass 3: token-set equality after aliases (mani→manicure, etc).
  const targetWords = tokenSet(target);
  if (targetWords.size > 0) {
    for (const v of bookableVariations) {
      const vName = normalizeName(v.item_variation_data?.name);
      const parentName = items.get(v.item_variation_data?.item_id ?? "")?.name ?? "";
      const fullName = `${parentName} ${vName}`.trim();
      if (isCombo(fullName) !== targetIsCombo) continue;
      const candidateWords = tokenSet(fullName);
      if (candidateWords.size !== targetWords.size) continue;
      let allMatch = true;
      for (const w of targetWords) {
        if (!candidateWords.has(w)) { allMatch = false; break; }
      }
      if (allMatch) return build(v);
    }
  }

  // Pass 4: all target tokens present in candidate (subset match), combo
  // boundary enforced. Pick the candidate with the highest similarity score.
  let bestSubset: { v: SquareCatalogItemVariation; score: number } | null = null;
  for (const v of bookableVariations) {
    const vName = normalizeName(v.item_variation_data?.name);
    const parentName = items.get(v.item_variation_data?.item_id ?? "")?.name ?? "";
    const fullName = `${parentName} ${vName}`.trim();
    if (isCombo(fullName) !== targetIsCombo) continue;
    const score = tokenSimilarityScore(target, fullName);
    if (score > 0 && (!bestSubset || score > bestSubset.score)) {
      bestSubset = { v, score };
    }
  }
  if (bestSubset) return build(bestSubset.v);

  // Pass 5: best Jaccard overlap, combo-boundary enforced. Last-resort so a
  // booking still syncs even if wording differs slightly between site and
  // Square catalog. Requires at least 50% token overlap.
  let bestJaccard: { v: SquareCatalogItemVariation; ratio: number } | null = null;
  if (targetWords.size > 0) {
    for (const v of bookableVariations) {
      const vName = normalizeName(v.item_variation_data?.name);
      const parentName = items.get(v.item_variation_data?.item_id ?? "")?.name ?? "";
      const fullName = `${parentName} ${vName}`.trim();
      if (isCombo(fullName) !== targetIsCombo) continue;
      const candidateWords = tokenSet(fullName);
      if (candidateWords.size === 0) continue;
      let overlap = 0;
      for (const w of targetWords) if (candidateWords.has(w)) overlap++;
      const union = new Set([...targetWords, ...candidateWords]).size;
      const ratio = union > 0 ? overlap / union : 0;
      if (ratio >= 0.5 && (!bestJaccard || ratio > bestJaccard.ratio)) {
        bestJaccard = { v, ratio };
      }
    }
  }
  if (bestJaccard) {
    console.warn(
      `findServiceVariationByName: fuzzy match for "${serviceName}" → "${bestJaccard.v.item_variation_data?.name}" (Jaccard ${bestJaccard.ratio.toFixed(2)})`,
    );
    return build(bestJaccard.v);
  }

  console.error(
    `findServiceVariationByName: no Square service match for "${serviceName}" (normalized "${target}")`,
  );
  return null;
}

interface PushBookingService {
  name: string;
  durationMinutes: number;
}

interface PushBookingArgs {
  serviceName: string;
  staffName: string;
  /** YYYY-MM-DD */
  appointmentDate: string;
  /** HH:MM or HH:MM:SS */
  appointmentTime: string;
  durationMinutes: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  notes?: string | null;
  /** Local timezone of the salon (NYC). */
  timezone?: string;
  /** When set, "Any Available" prefers a Square team member id from this list. */
  preferredTeamMemberIds?: string[];
  /** Stable key from the website booking row/payment so retries don't duplicate Square bookings. */
  idempotencyKey?: string;
  /**
   * Optional per-service breakdown for multi-service reservations. When
   * provided with >1 entries, Square Appointments will receive one
   * appointment_segment per service (back-to-back, same team member).
   * The first entry's name is used for the parent serviceName match
   * if `serviceName` doesn't resolve. Each entry resolves its own
   * Square service_variation via the catalog.
   */
  services?: PushBookingService[];
}

interface PushBookingResult {
  bookingId: string;
  teamMemberId: string | null;
}

/**
 * Build an ISO timestamp for the given local date/time in the salon's timezone.
 * NYC is America/New_York. We compute the UTC offset for that specific moment
 * (handles DST automatically) and produce an ISO string Square accepts.
 */
function localToIso(date: string, time: string, tz: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);

  // Build a UTC date matching the wall-clock components, then figure out the
  // offset that timezone has at that instant.
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const tzDate = new Date(utcGuess);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(tzDate).map((p) => [p.type, p.value]),
  );
  const asLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMs = asLocal - utcGuess;
  // Emit the timestamp WITH an explicit Eastern offset (e.g. -04:00 / -05:00)
  // instead of UTC "Z". Same instant either way, but the request body now
  // unambiguously reads as Eastern Time in Square's API logs.
  const totalOffsetMin = Math.round(offsetMs / 60000); // minutes east of UTC
  const sign = totalOffsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(totalOffsetMin);
  const offH = String(Math.floor(abs / 60)).padStart(2, "0");
  const offM = String(abs % 60).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00${sign}${offH}:${offM}`;
}

/**
 * Find or create a Square customer, then create a Square Appointments booking.
 * Returns the Square booking ID. Throws on any failure (caller decides how to
 * react — usually log + flag in admin email; do NOT fail the website booking).
 */
export async function pushBookingToSquare(
  cfg: SquareConfig,
  args: PushBookingArgs,
): Promise<PushBookingResult> {
  const tz = args.timezone ?? "America/New_York";

  // 1. Resolve service variation(s)
  //    For multi-service reservations, resolve one Square variation per
  //    service so the appointment shows the correct line items + total
  //    duration on the Square calendar. Fall back to a single segment
  //    using `serviceName` when only one service is provided.
  const serviceList: PushBookingService[] =
    args.services && args.services.length > 0
      ? args.services
      : [{ name: args.serviceName, durationMinutes: args.durationMinutes }];

  const resolvedSegments: Array<{
    variationId: string;
    variationVersion: number;
    durationMinutes: number;
  }> = [];
  for (const s of serviceList) {
    const v = await findServiceVariationByName(cfg, s.name);
    if (!v) {
      throw new Error(
        `No Square service matched "${s.name}" — add it in Square Catalog.`,
      );
    }
    // Prefer caller-supplied duration (matches what the customer was quoted)
    // over the catalog default, but never go below 15 min.
    resolvedSegments.push({
      variationId: v.variationId,
      variationVersion: v.variationVersion,
      durationMinutes: Math.max(15, s.durationMinutes || v.durationMinutes),
    });
  }

  // 2. Resolve team member (optional — null means "any")
  const teamMemberId = await findTeamMemberByName(cfg, args.staffName, args.preferredTeamMemberIds);

  // 3. Find or create customer
  let customerId: string | null = null;
  const phoneE164 = toE164US(args.customer.phone);
  const tryCustomerSearch = async (filter: Record<string, unknown>) => {
    const search = await squareFetch(cfg, "/customers/search", {
      method: "POST",
      body: JSON.stringify({ query: { filter }, limit: 10 }),
    });
    const customers = search?.customers ?? [];
    return customers.find((c: any) => customerLooksLikeMatch(c, args.customer)) ?? null;
  };

  try {
    const byEmail = await tryCustomerSearch({ email_address: { exact: args.customer.email } });
    customerId = byEmail?.id ?? null;
  } catch {
    /* fall through to phone/create */
  }
  if (!customerId && phoneE164) {
    try {
      const byPhone = await tryCustomerSearch({ phone_number: { exact: phoneE164 } });
      customerId = byPhone?.id ?? null;
    } catch {
      /* fall through to create */
    }
  }
  if (!customerId) {
    const created = await squareFetch(cfg, "/customers", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: `cust-${args.idempotencyKey ?? crypto.randomUUID()}`.slice(0, 255),
        given_name: args.customer.firstName,
        family_name: args.customer.lastName,
        email_address: args.customer.email,
        ...(phoneE164 ? { phone_number: phoneE164 } : {}),
      }),
    });
    customerId = created?.customer?.id ?? null;
  }
  if (!customerId) throw new Error("Could not find or create Square customer");

  // 4. Create the booking
  const startAt = localToIso(args.appointmentDate, args.appointmentTime, tz);

  const bookingPayload: Record<string, unknown> = {
    idempotency_key: `book-${args.idempotencyKey ?? crypto.randomUUID()}`.slice(0, 255),
    booking: {
      start_at: startAt,
      location_id: cfg.locationId,
      customer_id: customerId,
      customer_note: args.notes ?? undefined,
      appointment_segments: resolvedSegments.map((seg) => ({
        duration_minutes: seg.durationMinutes,
        service_variation_id: seg.variationId,
        service_variation_version: seg.variationVersion,
        ...(teamMemberId ? { team_member_id: teamMemberId } : {}),
      })),
    },
  };

  if (!teamMemberId) {
    throw new Error(
      `No matching Square team member for "${args.staffName}" — Square requires a specific team member on each booking.`,
    );
  }

  const json = await squareFetch(cfg, "/bookings", {
    method: "POST",
    body: JSON.stringify(bookingPayload),
  });
  const bookingId: string | undefined = json?.booking?.id;
  if (!bookingId) throw new Error("Square did not return a booking id");

  return { bookingId, teamMemberId };
}

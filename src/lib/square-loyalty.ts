// Square Loyalty API helper.
// Source of truth for points lives in Square (POS + online share one balance).
// Used by booking endpoints (to award) and /rewards (to look up balance).

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

type SquareAuth = { token: string };

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Square-Version": SQUARE_VERSION,
    "Content-Type": "application/json",
  };
}

// Normalize a phone number to E.164 (assume US if no country code).
export function toE164(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

let cachedProgramId: string | null = null;
let cachedProgramAt = 0;

export async function getLoyaltyProgramId(auth: SquareAuth): Promise<string | null> {
  if (cachedProgramId && Date.now() - cachedProgramAt < 1000 * 60 * 60) {
    return cachedProgramId;
  }
  const res = await fetch(`${SQUARE_API}/loyalty/programs/main`, {
    headers: authHeaders(auth.token),
  });
  const json: any = await res.json();
  if (!res.ok) {
    console.error("Square loyalty program fetch failed", json);
    return null;
  }
  cachedProgramId = json?.program?.id ?? null;
  cachedProgramAt = Date.now();
  return cachedProgramId;
}

export async function searchLoyaltyAccountByPhone(
  auth: SquareAuth,
  phoneE164: string,
): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/accounts/search`, {
    method: "POST",
    headers: authHeaders(auth.token),
    body: JSON.stringify({
      query: { mappings: [{ phone_number: phoneE164 }] },
    }),
  });
  const json: any = await res.json();
  if (!res.ok) {
    console.error("Loyalty account search failed", json);
    return null;
  }
  return json?.loyalty_accounts?.[0] ?? null;
}

export async function createLoyaltyAccount(
  auth: SquareAuth,
  programId: string,
  phoneE164: string,
): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/accounts`, {
    method: "POST",
    headers: authHeaders(auth.token),
    body: JSON.stringify({
      idempotency_key: `acct-${phoneE164}-${Date.now()}`,
      loyalty_account: {
        program_id: programId,
        mapping: { phone_number: phoneE164 },
      },
    }),
  });
  const json: any = await res.json();
  if (!res.ok) {
    console.error("Loyalty account create failed", json);
    return null;
  }
  return json?.loyalty_account ?? null;
}

export async function accumulatePoints(
  auth: SquareAuth,
  accountId: string,
  locationId: string,
  points: number,
  idempotencyKey: string,
): Promise<boolean> {
  const res = await fetch(
    `${SQUARE_API}/loyalty/accounts/${accountId}/accumulate`,
    {
      method: "POST",
      headers: authHeaders(auth.token),
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        accumulate_points: { points },
        location_id: locationId,
      }),
    },
  );
  const json: any = await res.json();
  if (!res.ok) {
    console.error("Loyalty accumulate failed", json);
    return false;
  }
  return true;
}

/**
 * Award N points (default 1) to the customer identified by phone.
 * Creates the loyalty account if it doesn't exist.
 * Non-fatal: returns null on any failure (caller should not block bookings).
 */
export async function awardPointsForBooking(opts: {
  token: string;
  locationId: string;
  phone: string;
  points?: number;
  idempotencyKey: string;
}): Promise<{ accountId: string; balance: number | null } | null> {
  try {
    const phoneE164 = toE164(opts.phone);
    if (!phoneE164) return null;
    const auth = { token: opts.token };

    const programId = await getLoyaltyProgramId(auth);
    if (!programId) return null;

    let account = await searchLoyaltyAccountByPhone(auth, phoneE164);
    if (!account) {
      account = await createLoyaltyAccount(auth, programId, phoneE164);
    }
    if (!account?.id) return null;

    const ok = await accumulatePoints(
      auth,
      account.id,
      opts.locationId,
      opts.points ?? 1,
      opts.idempotencyKey,
    );
    if (!ok) return { accountId: account.id, balance: account.balance ?? null };

    // Re-fetch balance
    const refreshed = await searchLoyaltyAccountByPhone(auth, phoneE164);
    return {
      accountId: account.id,
      balance: refreshed?.balance ?? null,
    };
  } catch (e) {
    console.error("awardPointsForBooking failed (non-fatal)", e);
    return null;
  }
}

export async function lookupBalanceByPhone(opts: {
  token: string;
  phone: string;
}): Promise<{ found: boolean; balance: number; lifetimePoints: number; customerName?: string | null } | null> {
  try {
    const phoneE164 = toE164(opts.phone);
    if (!phoneE164) return { found: false, balance: 0, lifetimePoints: 0 };
    const auth = { token: opts.token };
    const account = await searchLoyaltyAccountByPhone(auth, phoneE164);
    if (!account) return { found: false, balance: 0, lifetimePoints: 0 };
    return {
      found: true,
      balance: account.balance ?? 0,
      lifetimePoints: account.lifetime_points ?? 0,
      customerName: null,
    };
  } catch (e) {
    console.error("lookupBalanceByPhone failed", e);
    return null;
  }
}

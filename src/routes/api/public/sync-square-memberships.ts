import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/verify-admin";

// Pulls all subscriptions from Square and inserts ones not yet in `memberships`.
// Matches by `square_subscription_id` — never overwrites existing rows.
// Idempotent: safe to run repeatedly.

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

// Reverse map: Square plan variation ID → tier name + price
// Mirrors TIER_CONFIG in enroll-membership.ts
const VARIATION_TO_TIER: Record<string, { tier: string; priceCents: number }> = {
  "7IWIPR6N45KBG7O4P64PI35H": { tier: "2× Builder Gel + 2× Regular Pedi", priceCents: 20000 },
  "IYCG342PXLDPQOWUSKJDZJOR": { tier: "2× Builder Gel + Gel Pedi", priceCents: 18000 },
  "WTR45BNIBH25ID434Y2LPRHS": { tier: "Acrylic Cover Backfill S–M", priceCents: 12000 },
  "YIR27T6MQTISHOFY24TJ2TLV": { tier: "Acrylic Refill + Gel Pedi", priceCents: 16200 },
  "F3XUQDR763MA3LDWMDHX2RJE": { tier: "Basic — Mani & Pedi", priceCents: 9300 },
  "PPGGAR6HYTNEKFM7I7NGYYTU": { tier: "Buff Mani & Pedi", priceCents: 8500 },
  "ZC6E6HYMPYZMI3LL4BQ5UZCI": { tier: "Buff Manicure Only", priceCents: 4500 },
  "XNDTYZQZA7LWU42XPAEOP6T2": { tier: "Builder Gel + Gel Pedi", priceCents: 11300 },
  "LHMADWCFCH4G6V2Y4B4GM4TL": { tier: "Gel Mani & Gel Pedi", priceCents: 12000 },
  "ZQBH53JGKFGPRROQWKPUM35L": { tier: "Gel Mani + Regular Pedi", priceCents: 14500 },
  "M6IVANQRPCDREW65NWOVAKH7": { tier: "Gel Mani + Regular Pedi (Lite)", priceCents: 11000 },
  "H2HLHUT76BRJNSGZ2OOOYIMV": { tier: "Premium Gel Mani & Pedi", priceCents: 19000 },
  "O6MORF564QGMLPRU5QO4VWGK": { tier: "Premium Spa Gel Pedicure + Soak Off", priceCents: 7800 },
  "S3YWQTOS5PPQLJHHEW5SQPF2": { tier: "Premium Spa Pedi + Mani Gel", priceCents: 16000 },
  "MHUYBWY52X27OVXRTY53N4QG": { tier: "Protein Gel Mani & Spa Gel Pedi", priceCents: 16500 },
  "6SZ7XSKP2UA6GEQS2IBFLBFV": { tier: "Regular Pedi Only", priceCents: 6600 },
  "5U7QCRWEYLDQHDJD4V7KTP6S": { tier: "Russian Acrylic Refill + Regular Pedi", priceCents: 19000 },
  "BY5SFSY6P3BB5OO6LWSE7T6Y": { tier: "Russian Buff Manicures", priceCents: 6500 },
  "VNY6RZVIZKMGDA54RLRNJNIS": { tier: "Russian Gel Mani & Pedi", priceCents: 12000 },
  "UZ5VSWJ5GT3ZQF43VIHD7LEB": { tier: "Russian Gel-X Extensions + Gel Pedi", priceCents: 16000 },
  "Z3YBP5VKK27DAJ35RVGZYKVZ": { tier: "Russian Hardgel Overlay + Russian Gel Pedi", priceCents: 16500 },
  "CMVE6DLNB5XBCDNGXTRI3GWO": { tier: "Russian Mani + Gel Pedi", priceCents: 16000 },
  "UVG3LRQ54EWU6WIPRROTTMST": { tier: "2× Long Acrylic Refill + Regular Pedi", priceCents: 16200 },
};

type SquareSubscription = {
  id: string;
  status?: string;
  customer_id?: string;
  plan_variation_id?: string;
  start_date?: string;
  created_at?: string;
  canceled_date?: string;
};

type SquareCustomer = {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
};

function mapStatus(squareStatus?: string): string {
  switch (squareStatus) {
    case "ACTIVE": return "active";
    case "PENDING": return "pending";
    case "PAUSED": return "paused";
    case "CANCELED":
    case "DEACTIVATED": return "cancelled";
    default: return (squareStatus ?? "pending").toLowerCase();
  }
}

export const Route = createFileRoute("/api/public/sync-square-memberships")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        const token = process.env.SQUARE_ACCESS_TOKEN;
        const locationId = process.env.SQUARE_LOCATION_ID;
        if (!token) return Response.json({ error: "Square not configured" }, { status: 500 });

        try {
          // 1. Page through all subscriptions
          const subs: SquareSubscription[] = [];
          let cursor: string | undefined;
          let pages = 0;
          const MAX_PAGES = 50;

          do {
            const res = await fetch(`${SQUARE_API}/subscriptions/search`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cursor,
                limit: 100,
                query: locationId
                  ? { filter: { location_ids: [locationId] } }
                  : undefined,
              }),
            });
            if (!res.ok) {
              const body = await res.text().catch(() => "");
              return Response.json(
                { error: `Square subscriptions error ${res.status}: ${body.slice(0, 300)}` },
                { status: 502 },
              );
            }
            const json = await res.json();
            const batch: SquareSubscription[] = json?.subscriptions ?? [];
            subs.push(...batch);
            cursor = json?.cursor;
            pages++;
          } while (cursor && pages < MAX_PAGES);

          if (subs.length === 0) {
            return Response.json({ ok: true, scanned: 0, inserted: 0, skipped_existing: 0, skipped_unknown_plan: 0, skipped_no_customer: 0 });
          }

          // 2. Find which subscriptions already exist locally
          const subIds = subs.map((s) => s.id);
          const existing = new Set<string>();
          for (let i = 0; i < subIds.length; i += 500) {
            const slice = subIds.slice(i, i + 500);
            const { data } = await supabaseAdmin
              .from("memberships")
              .select("square_subscription_id")
              .in("square_subscription_id", slice);
            for (const r of (data ?? []) as Array<{ square_subscription_id: string }>) {
              if (r.square_subscription_id) existing.add(r.square_subscription_id);
            }
          }

          // 3. Update status on existing subs (so e.g. PENDING → ACTIVE flips when Square activates them)
          let statusUpdates = 0;
          for (const s of subs) {
            if (!existing.has(s.id)) continue;
            const newStatus = mapStatus(s.status);
            const { error: upErr, count } = await supabaseAdmin
              .from("memberships")
              .update({ status: newStatus }, { count: "exact" })
              .eq("square_subscription_id", s.id)
              .neq("status", newStatus);
            if (!upErr && count) statusUpdates += count;
          }

          // 4. Filter to new subscriptions and collect their customer IDs
          const newSubs = subs.filter((s) => !existing.has(s.id));
          const customerIds = Array.from(
            new Set(newSubs.map((s) => s.customer_id).filter((x): x is string => Boolean(x))),
          );

          // 4. Batch fetch customers
          const customers = new Map<string, SquareCustomer>();
          for (let i = 0; i < customerIds.length; i += 100) {
            const slice = customerIds.slice(i, i + 100);
            const res = await fetch(`${SQUARE_API}/customers/search`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                limit: 100,
                query: { filter: { creation_source: undefined } },
              }),
            });
            // Fallback: fetch each individually (search by id isn't supported directly)
            // Use the batch-retrieve via individual GETs in parallel chunks.
            void res;
            await Promise.all(
              slice.map(async (cid) => {
                try {
                  const r = await fetch(`${SQUARE_API}/customers/${cid}`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Square-Version": SQUARE_VERSION,
                    },
                  });
                  if (!r.ok) return;
                  const j = await r.json();
                  if (j?.customer) customers.set(cid, j.customer as SquareCustomer);
                } catch {
                  /* ignore */
                }
              }),
            );
          }

          // 5. Build insert rows
          let skippedUnknownPlan = 0;
          let skippedNoCustomer = 0;
          type MembershipRow = {
            customer_first_name: string;
            customer_last_name: string;
            customer_email: string;
            customer_phone: string;
            billing_address_line1: string | null;
            billing_address_line2: string | null;
            billing_city: string | null;
            billing_state: string | null;
            billing_postal_code: string | null;
            billing_country: string;
            tier_name: string;
            monthly_price_cents: number;
            square_customer_id: string;
            square_subscription_id: string;
            square_plan_variation_id: string;
            status: string;
            enrolled_at: string;
            notes: string;
          };
          const rows: MembershipRow[] = [];

          for (const s of newSubs) {
            const variation = s.plan_variation_id ?? "";
            const tierInfo = VARIATION_TO_TIER[variation];
            if (!tierInfo) { skippedUnknownPlan++; continue; }
            if (!s.customer_id) { skippedNoCustomer++; continue; }
            const c = customers.get(s.customer_id);
            if (!c) { skippedNoCustomer++; continue; }

            const first = (c.given_name ?? "").trim() || "Member";
            const last = (c.family_name ?? "").trim() || "—";
            const email = (c.email_address ?? "").trim().toLowerCase();
            const phone = (c.phone_number ?? "").trim() || "—";
            if (!email) { skippedNoCustomer++; continue; }

            rows.push({
              customer_first_name: first,
              customer_last_name: last,
              customer_email: email,
              customer_phone: phone,
              billing_address_line1: c.address?.address_line_1 ?? null,
              billing_address_line2: c.address?.address_line_2 ?? null,
              billing_city: c.address?.locality ?? null,
              billing_state: c.address?.administrative_district_level_1 ?? null,
              billing_postal_code: c.address?.postal_code ?? null,
              billing_country: c.address?.country ?? "US",
              tier_name: tierInfo.tier,
              monthly_price_cents: tierInfo.priceCents,
              square_customer_id: s.customer_id,
              square_subscription_id: s.id,
              square_plan_variation_id: variation,
              status: mapStatus(s.status),
              enrolled_at: s.start_date ?? s.created_at ?? new Date().toISOString(),
              notes: "Imported from Square",
            });
          }

          // 6. Insert in chunks
          let inserted = 0;
          for (let i = 0; i < rows.length; i += 100) {
            const slice = rows.slice(i, i + 100);
            const { error } = await supabaseAdmin.from("memberships").insert(slice);
            if (error) {
              console.error("memberships insert error:", error);
              continue;
            }
            inserted += slice.length;
          }

          return Response.json({
            ok: true,
            scanned: subs.length,
            already_existed: subs.length - newSubs.length,
            status_updates: statusUpdates,
            inserted,
            skipped_unknown_plan: skippedUnknownPlan,
            skipped_no_customer: skippedNoCustomer,
          });
        } catch (err) {
          console.error("sync-square-memberships fatal:", err);
          const msg = err instanceof Error ? err.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

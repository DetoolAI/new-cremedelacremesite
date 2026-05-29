import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/verify-admin";

// Returns a diff between Square Catalog and our `services` table — the admin
// previews this and then POSTs to /sync-square-services-apply to commit.
//
// Diff classification (by service NAME, case-insensitive):
//   - added    → in Square, not in DB
//   - updated  → in both, but duration differs (we only auto-update duration; price stays manual)
//   - removed  → in DB, not in Square (we DON'T auto-delete, just flag)
//   - unchanged

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

type SquareItem = {
  type: string;
  id: string;
  item_data?: { name?: string };
};
type SquareVariation = {
  type: string;
  id: string;
  item_variation_data?: {
    name?: string;
    item_id?: string;
    service_duration?: number; // ms
    price_money?: { amount?: number; currency?: string };
  };
};

type DiffEntry = {
  status: "added" | "updated" | "removed" | "unchanged";
  square_name?: string;
  square_duration_minutes?: number;
  square_price_text?: string | null;
  db_id?: string;
  db_name?: string;
  db_duration_minutes?: number;
};

function norm(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function fetchSquareCatalog(token: string) {
  const res = await fetch(
    `${SQUARE_API}/catalog/list?types=ITEM,ITEM_VARIATION`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Square catalog error ${res.status}`);
  }
  const json = await res.json();
  const objects: Array<SquareItem | SquareVariation> = json?.objects ?? [];

  const items = new Map<string, string>();
  for (const o of objects) {
    if (o.type === "ITEM" && (o as SquareItem).item_data?.name) {
      items.set(o.id, (o as SquareItem).item_data!.name!);
    }
  }

  // Build a list of service-style entries: prefer the variation name; fall back
  // to the parent item name if the variation has no distinct name.
  const services: Array<{
    name: string;
    duration_minutes: number;
    price_text: string | null;
  }> = [];

  for (const o of objects) {
    if (o.type !== "ITEM_VARIATION") continue;
    const v = o as SquareVariation;
    const parent = items.get(v.item_variation_data?.item_id ?? "") ?? "";
    const variationName = v.item_variation_data?.name?.trim();
    const displayName =
      variationName && variationName.toLowerCase() !== "regular"
        ? `${parent} — ${variationName}`.trim()
        : parent;
    if (!displayName) continue;

    const durationMs = v.item_variation_data?.service_duration ?? 0;
    const durationMinutes = durationMs > 0 ? Math.round(durationMs / 60000) : 60;

    const price = v.item_variation_data?.price_money;
    const priceText =
      price && typeof price.amount === "number"
        ? `$${(price.amount / 100).toFixed(0)}`
        : null;

    services.push({
      name: displayName,
      duration_minutes: durationMinutes,
      price_text: priceText,
    });
  }

  return services;
}

export const Route = createFileRoute("/api/public/sync-square-services")({
  server: {
    handlers: {
      // Preview only — returns diff
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        const token = process.env.SQUARE_ACCESS_TOKEN;
        if (!token) return Response.json({ error: "Square not configured" }, { status: 500 });

        try {
          const squareServices = await fetchSquareCatalog(token);

          const { data: dbServices } = await supabaseAdmin
            .from("services")
            .select("id, name, duration_minutes, active")
            .eq("active", true);

          const dbByName = new Map<string, { id: string; name: string; duration_minutes: number }>();
          for (const s of (dbServices ?? []) as Array<{ id: string; name: string; duration_minutes: number }>) {
            dbByName.set(norm(s.name), s);
          }

          const squareByName = new Map<string, typeof squareServices[number]>();
          for (const s of squareServices) squareByName.set(norm(s.name), s);

          const diff: DiffEntry[] = [];

          // added + updated + unchanged
          for (const [key, s] of squareByName) {
            const db = dbByName.get(key);
            if (!db) {
              diff.push({
                status: "added",
                square_name: s.name,
                square_duration_minutes: s.duration_minutes,
                square_price_text: s.price_text,
              });
            } else if (db.duration_minutes !== s.duration_minutes) {
              diff.push({
                status: "updated",
                square_name: s.name,
                square_duration_minutes: s.duration_minutes,
                square_price_text: s.price_text,
                db_id: db.id,
                db_name: db.name,
                db_duration_minutes: db.duration_minutes,
              });
            } else {
              diff.push({
                status: "unchanged",
                square_name: s.name,
                square_duration_minutes: s.duration_minutes,
                db_id: db.id,
                db_name: db.name,
                db_duration_minutes: db.duration_minutes,
              });
            }
          }

          // removed
          for (const [key, db] of dbByName) {
            if (!squareByName.has(key)) {
              diff.push({
                status: "removed",
                db_id: db.id,
                db_name: db.name,
                db_duration_minutes: db.duration_minutes,
              });
            }
          }

          return Response.json({
            ok: true,
            square_count: squareServices.length,
            db_count: (dbServices ?? []).length,
            diff,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

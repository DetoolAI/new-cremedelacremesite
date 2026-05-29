import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/verify-admin";

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

async function sq(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${SQUARE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 500));
  return json;
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

function parsePriceCents(text: string | null | undefined): number {
  if (!text) return 0;
  const m = String(text).match(/\$?\s*(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * 100);
}

export const Route = createFileRoute("/api/public/sync-services-to-square")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        const token = process.env.SQUARE_ACCESS_TOKEN;
        const locationId = process.env.SQUARE_LOCATION_ID;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!token || !locationId || !supabaseUrl || !serviceKey) {
          return Response.json({ error: "Missing env" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: services, error } = await supabase
          .from("services")
          .select("id, name, duration_minutes, price_text, active")
          .eq("active", true);
        if (error || !services) {
          return Response.json({ error: error?.message ?? "no services" }, { status: 500 });
        }

        // Fetch existing Square items
        const cat = await sq(token, "/catalog/list?types=ITEM");
        const existing = new Set<string>();
        for (const o of cat.objects ?? []) {
          const name = o.item_data?.name;
          if (name) existing.add(norm(name));
        }

        const created: string[] = [];
        const skipped: string[] = [];
        const failed: { name: string; error: string }[] = [];

        for (const svc of services) {
          if (existing.has(norm(svc.name))) {
            skipped.push(svc.name);
            continue;
          }

          const durationMs = (svc.duration_minutes ?? 60) * 60 * 1000;
          const priceCents = parsePriceCents(svc.price_text);

          const body = {
            idempotency_key: `svc-${svc.id}`,
            object: {
              type: "ITEM",
              id: `#item_${svc.id}`,
              present_at_all_locations: true,
              item_data: {
                name: svc.name,
                product_type: "APPOINTMENTS_SERVICE",
                variations: [
                  {
                    type: "ITEM_VARIATION",
                    id: `#var_${svc.id}`,
                    present_at_all_locations: true,
                    item_variation_data: {
                      name: "Regular",
                      pricing_type: priceCents > 0 ? "FIXED_PRICING" : "VARIABLE_PRICING",
                      ...(priceCents > 0
                        ? { price_money: { amount: priceCents, currency: "USD" } }
                        : {}),
                      service_duration: durationMs,
                      available_for_booking: true,
                    },
                  },
                ],
              },
            },
          };

          try {
            await sq(token, "/catalog/object", {
              method: "POST",
              body: JSON.stringify(body),
            });
            created.push(svc.name);
          } catch (e: any) {
            failed.push({ name: svc.name, error: String(e?.message ?? e).slice(0, 300) });
          }
        }

        return Response.json({
          totalSiteServices: services.length,
          createdCount: created.length,
          skippedCount: skipped.length,
          failedCount: failed.length,
          created,
          skipped,
          failed,
        });
      },
    },
  },
});

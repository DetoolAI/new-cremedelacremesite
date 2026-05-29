import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/verify-admin";

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

async function sq(token: string, path: string) {
  const res = await fetch(`${SQUARE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 500));
  return json;
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

export const Route = createFileRoute("/api/public/pull-square-variation-ids")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

        const token = process.env.SQUARE_ACCESS_TOKEN;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!token || !supabaseUrl || !serviceKey) {
          return Response.json({ error: "Missing env" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: services, error } = await supabase
          .from("services")
          .select("id, name");
        if (error || !services) {
          return Response.json({ error: error?.message ?? "no services" }, { status: 500 });
        }

        // Fetch all Square items (paginated)
        const itemsByName = new Map<string, { itemId: string; variationId: string }>();
        let cursor: string | undefined;
        do {
          const path = `/catalog/list?types=ITEM${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
          const cat = await sq(token, path);
          for (const o of cat.objects ?? []) {
            const name = o.item_data?.name;
            const variations = o.item_data?.variations ?? [];
            const firstVar = variations[0];
            if (name && firstVar?.id) {
              itemsByName.set(norm(name), { itemId: o.id, variationId: firstVar.id });
            }
          }
          cursor = cat.cursor;
        } while (cursor);

        let matched = 0;
        const unmatched: string[] = [];

        for (const svc of services) {
          const found = itemsByName.get(norm(svc.name));
          if (!found) {
            unmatched.push(svc.name);
            continue;
          }
          const { error: upErr } = await supabase
            .from("services")
            .update({
              square_variation_id: found.variationId,
              square_item_id: found.itemId,
            })
            .eq("id", svc.id);
          if (upErr) {
            unmatched.push(`${svc.name} (update failed: ${upErr.message})`);
          } else {
            matched++;
          }
        }

        return Response.json({ matched, unmatched });
      },
    },
  },
});

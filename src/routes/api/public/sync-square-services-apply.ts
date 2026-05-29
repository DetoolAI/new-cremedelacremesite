import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/verify-admin";

// Applies a Square→services diff. The admin sends only the entries they want
// to apply (added / updated). We never auto-delete; "removed" entries are
// surfaced for the admin to handle manually inside the Services editor.
//
// Body shape:
//   {
//     category_id: string,                       // where new services land
//     to_add:    [{ name, duration_minutes, price_text }],
//     to_update: [{ db_id, duration_minutes }]
//   }

type ApplyBody = {
  category_id?: string;
  to_add?: Array<{
    name: string;
    duration_minutes: number;
    price_text?: string | null;
  }>;
  to_update?: Array<{ db_id: string; duration_minutes: number }>;
};

export const Route = createFileRoute("/api/public/sync-square-services-apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        let body: ApplyBody;
        try {
          body = (await request.json()) as ApplyBody;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const toAdd = Array.isArray(body.to_add) ? body.to_add : [];
        const toUpdate = Array.isArray(body.to_update) ? body.to_update : [];

        if (toAdd.length === 0 && toUpdate.length === 0) {
          return Response.json({ ok: true, added: 0, updated: 0 });
        }

        // For inserts we need a category_id. Fall back to the first active category.
        let categoryId = body.category_id;
        if (!categoryId && toAdd.length > 0) {
          const { data } = await supabaseAdmin
            .from("service_categories")
            .select("id")
            .eq("active", true)
            .order("display_order")
            .limit(1);
          categoryId = data?.[0]?.id;
          if (!categoryId) {
            return Response.json(
              { error: "No service category exists — create one first." },
              { status: 400 },
            );
          }
        }

        let added = 0;
        let updated = 0;
        const errors: string[] = [];

        if (toAdd.length > 0) {
          const rows = toAdd.map((s, i) => ({
            category_id: categoryId!,
            name: s.name.slice(0, 200),
            duration_minutes: Math.max(15, Math.min(600, Math.round(s.duration_minutes || 60))),
            price_text: s.price_text ?? null,
            display_order: 1000 + i,
            active: true,
          }));
          const { error, count } = await supabaseAdmin
            .from("services")
            .insert(rows, { count: "exact" });
          if (error) errors.push(`insert: ${error.message}`);
          else added = count ?? rows.length;
        }

        for (const u of toUpdate) {
          const { error } = await supabaseAdmin
            .from("services")
            .update({
              duration_minutes: Math.max(15, Math.min(600, Math.round(u.duration_minutes || 60))),
            })
            .eq("id", u.db_id);
          if (error) errors.push(`update ${u.db_id}: ${error.message}`);
          else updated++;
        }

        return Response.json({
          ok: errors.length === 0,
          added,
          updated,
          errors: errors.length ? errors : undefined,
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { verifyAdmin } from "@/lib/verify-admin";

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

export const Route = createFileRoute("/api/public/debug-square-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        const token = process.env.SQUARE_ACCESS_TOKEN!;
        const allItems: any[] = [];
        let cursor: string | undefined = undefined;
        do {
          const url = new URL(`${SQUARE_API}/catalog/list`);
          url.searchParams.set("types", "ITEM,ITEM_VARIATION");
          if (cursor) url.searchParams.set("cursor", cursor);
          const res = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${token}`,
              "Square-Version": SQUARE_VERSION,
            },
          });
          const j: any = await res.json();
          if (!res.ok) return Response.json({ error: j }, { status: 500 });
          for (const o of j.objects ?? []) allItems.push(o);
          cursor = j.cursor;
        } while (cursor);

        const items = allItems.filter((o) => o.type === "ITEM");
        const variations = allItems.filter((o) => o.type === "ITEM_VARIATION");
        const itemMap = new Map(items.map((i) => [i.id, i]));
        const bookableNames = new Set<string>();
        for (const v of variations) {
          if (v.item_variation_data?.available_for_booking !== true) continue;
          const parent = itemMap.get(v.item_variation_data?.item_id ?? "");
          if (parent?.item_data?.product_type !== "APPOINTMENTS_SERVICE") continue;
          if (parent?.item_data?.name) bookableNames.add(parent.item_data.name);
        }
        return Response.json({
          totalObjects: allItems.length,
          itemCount: items.length,
          variationCount: variations.length,
          bookableServiceNames: Array.from(bookableNames).sort(),
        });
      },
    },
  },
});

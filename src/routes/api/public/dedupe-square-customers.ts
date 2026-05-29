import { createFileRoute } from "@tanstack/react-router";
import { verifyAdmin } from "@/lib/verify-admin";

/**
 * One-shot admin tool: scan Square Customers, group by normalized email or
 * phone, and merge each group with Square's MergeCustomers endpoint. Also
 * deletes any customer named exactly "Angel Duarte" (kept "Angie D").
 *
 * Protect with the SQUARE_DEDUPE_TOKEN secret. Call via:
 *   POST /api/public/dedupe-square-customers?token=...&dryRun=1
 * Set dryRun=0 to actually merge/delete.
 */
const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

interface SqCustomer {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  created_at?: string;
}

function normPhone(p?: string | null): string {
  return (p ?? "").replace(/\D/g, "").replace(/^1(\d{10})$/, "$1");
}
function normEmail(e?: string | null): string {
  return (e ?? "").trim().toLowerCase();
}
function fullName(c: SqCustomer): string {
  return `${c.given_name ?? ""} ${c.family_name ?? ""}`.trim().toLowerCase();
}

export const Route = createFileRoute("/api/public/dedupe-square-customers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.SQUARE_ACCESS_TOKEN;
        if (!token) return Response.json({ error: "Square not configured" }, { status: 500 });

        // Require admin auth (bearer). Optional SQUARE_DEDUPE_TOKEN adds a
        // second factor if configured.
        const admin = await verifyAdmin(request);
        if (!admin.ok) {
          return Response.json({ error: admin.error }, { status: admin.status });
        }
        const adminToken = process.env.SQUARE_DEDUPE_TOKEN;
        const url = new URL(request.url);
        if (adminToken && url.searchParams.get("token") !== adminToken) {
          return Response.json({ error: "Missing or invalid dedupe token" }, { status: 401 });
        }
        const dryRun = url.searchParams.get("dryRun") !== "0";


        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_VERSION,
        };

        // 1. Page through all customers
        const all: SqCustomer[] = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
          const qs = new URLSearchParams({ limit: "100", sort_field: "CREATED_AT", sort_order: "ASC" });
          if (cursor) qs.set("cursor", cursor);
          const r = await fetch(`${SQUARE_API}/customers?${qs.toString()}`, { headers });
          const j = await r.json() as { customers?: SqCustomer[]; cursor?: string; errors?: any };
          if (!r.ok) return Response.json({ error: "Square list failed", detail: j.errors }, { status: 502 });
          for (const c of (j.customers ?? [])) all.push(c);
          cursor = j.cursor;
          pages++;
          if (pages > 200) break; // safety: ~20k customers
        } while (cursor);

        // 2. Group by email, then by phone
        const byEmail = new Map<string, SqCustomer[]>();
        const byPhone = new Map<string, SqCustomer[]>();
        for (const c of all) {
          const e = normEmail(c.email_address);
          const p = normPhone(c.phone_number);
          if (e) {
            if (!byEmail.has(e)) byEmail.set(e, []);
            byEmail.get(e)!.push(c);
          } else if (p) {
            if (!byPhone.has(p)) byPhone.set(p, []);
            byPhone.get(p)!.push(c);
          }
        }

        const mergeGroups: { key: string; ids: string[]; primary: string }[] = [];
        for (const [k, list] of byEmail) {
          if (list.length > 1) {
            list.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
            mergeGroups.push({ key: `email:${k}`, ids: list.map(x => x.id), primary: list[0].id });
          }
        }
        for (const [k, list] of byPhone) {
          if (list.length > 1) {
            list.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
            mergeGroups.push({ key: `phone:${k}`, ids: list.map(x => x.id), primary: list[0].id });
          }
        }

        // 3. Identify Angel Duarte
        const angelDuarteIds = all
          .filter((c) => fullName(c) === "angel duarte")
          .map((c) => c.id);

        const result = {
          dryRun,
          totalCustomers: all.length,
          duplicateGroups: mergeGroups.length,
          duplicateRowsToMerge: mergeGroups.reduce((n, g) => n + (g.ids.length - 1), 0),
          angelDuarteFound: angelDuarteIds.length,
          merged: 0,
          deleted: 0,
          errors: [] as Array<{ what: string; detail: string }>,
        };

        if (dryRun) return Response.json(result);

        // 4. Merge each group
        for (const g of mergeGroups) {
          try {
            const r = await fetch(`${SQUARE_API}/customers/bulk-merge`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                primary_customer_id: g.primary,
                customer_ids_to_merge: g.ids.filter((id) => id !== g.primary),
              }),
            });
            const j = await r.json();
            if (!r.ok) result.errors.push({ what: `merge ${g.key}`, detail: JSON.stringify(j.errors ?? j) });
            else result.merged += g.ids.length - 1;
          } catch (e: any) {
            result.errors.push({ what: `merge ${g.key}`, detail: e?.message ?? "unknown" });
          }
        }

        // 5. Delete Angel Duarte rows
        for (const id of angelDuarteIds) {
          try {
            const r = await fetch(`${SQUARE_API}/customers/${id}`, { method: "DELETE", headers });
            if (r.ok) result.deleted++;
            else {
              const j = await r.json().catch(() => ({}));
              result.errors.push({ what: `delete ${id}`, detail: JSON.stringify(j) });
            }
          } catch (e: any) {
            result.errors.push({ what: `delete ${id}`, detail: e?.message ?? "unknown" });
          }
        }

        return Response.json(result);
      },
    },
  },
});

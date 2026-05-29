import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/verify-admin";

// Pulls all customers from Square and inserts ones not yet in loyalty_accounts.
// Conflict policy: ONLY ADD NEW. Never overwrites existing rows.
//
// Triggered from the admin UI ("Sync Square customers" button). Idempotent —
// safe to run repeatedly.

const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2024-10-17";

type SquareCustomer = {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
};

export const Route = createFileRoute("/api/public/sync-square-customers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        const token = process.env.SQUARE_ACCESS_TOKEN;
        if (!token) {
          return Response.json({ error: "Square not configured" }, { status: 500 });
        }

        let cursor: string | undefined = undefined;
        const allCustomers: SquareCustomer[] = [];
        let pages = 0;
        const MAX_PAGES = 50; // safety cap → ~5000 customers

        try {
          do {
            const url = new URL(`${SQUARE_API}/customers`);
            url.searchParams.set("limit", "100");
            if (cursor) url.searchParams.set("cursor", cursor);

            const res = await fetch(url.toString(), {
              headers: {
                Authorization: `Bearer ${token}`,
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
              },
            });
            if (!res.ok) {
              const body = await res.text().catch(() => "");
              return Response.json(
                { error: `Square error ${res.status}: ${body.slice(0, 300)}` },
                { status: 502 },
              );
            }
            const json = await res.json();
            const batch: SquareCustomer[] = json?.customers ?? [];
            allCustomers.push(...batch);
            cursor = json?.cursor;
            pages++;
          } while (cursor && pages < MAX_PAGES);

          // Filter to customers with an email
          const withEmail = allCustomers.filter(
            (c) => c.email_address && c.email_address.trim().length > 3,
          );

          // Fetch existing emails so we know which are new
          const emails = withEmail.map((c) => c.email_address!.toLowerCase().trim());
          const existing = new Set<string>();

          // Chunk to avoid overly long IN clauses
          const CHUNK = 500;
          for (let i = 0; i < emails.length; i += CHUNK) {
            const slice = emails.slice(i, i + CHUNK);
            const { data } = await supabaseAdmin
              .from("loyalty_accounts")
              .select("email")
              .in("email", slice);
            for (const r of (data ?? []) as Array<{ email: string }>) {
              existing.add(r.email.toLowerCase());
            }
          }

          const toInsert = withEmail
            .filter((c) => !existing.has(c.email_address!.toLowerCase().trim()))
            .map((c) => ({
              email: c.email_address!.toLowerCase().trim(),
              customer_name:
                [c.given_name, c.family_name].filter(Boolean).join(" ").trim() || null,
              phone: c.phone_number ?? null,
              points_balance: 0,
              lifetime_earned: 0,
              lifetime_redeemed: 0,
            }));

          let inserted = 0;
          for (let i = 0; i < toInsert.length; i += 200) {
            const slice = toInsert.slice(i, i + 200);
            const { error } = await supabaseAdmin
              .from("loyalty_accounts")
              .insert(slice);
            if (error) {
              console.error("loyalty insert error:", error);
              continue;
            }
            inserted += slice.length;
          }

          return Response.json({
            ok: true,
            scanned: allCustomers.length,
            with_email: withEmail.length,
            already_existed: withEmail.length - toInsert.length,
            inserted,
          });
        } catch (err) {
          console.error("sync-square-customers fatal:", err);
          const msg = err instanceof Error ? err.message : "Unknown error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

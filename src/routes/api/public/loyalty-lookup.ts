import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { lookupBalanceByPhone } from "@/lib/square-loyalty";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  identifier: z.string().trim().min(3).max(255),
});

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export const Route = createFileRoute("/api/public/loyalty-lookup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

        // Backward compat: accept { phone } or { email } or { identifier }
        const raw = body as any;
        const identifier: string =
          raw?.identifier ?? raw?.email ?? raw?.phone ?? "";
        const parsed = Schema.safeParse({ identifier });
        if (!parsed.success) {
          return Response.json({ error: "Enter a valid email or phone" }, { status: 400 });
        }
        const value = parsed.data.identifier;

        // Email path → Supabase loyalty_accounts
        if (isEmail(value)) {
          try {
            const { data, error } = await supabaseAdmin
              .from("loyalty_accounts")
              .select("points_balance, lifetime_earned, customer_name")
              .eq("email", value.toLowerCase())
              .maybeSingle();
            if (error) {
              console.error("loyalty email lookup failed", error);
              return Response.json({ error: "Lookup failed" }, { status: 502 });
            }
            if (!data) {
              return Response.json({ found: false, balance: 0, lifetimePoints: 0 });
            }
            return Response.json({
              found: true,
              balance: data.points_balance ?? 0,
              lifetimePoints: data.lifetime_earned ?? 0,
            });
          } catch (e) {
            console.error(e);
            return Response.json({ error: "Lookup failed" }, { status: 502 });
          }
        }

        // Phone path → Square
        const token = process.env.SQUARE_ACCESS_TOKEN;
        if (!token) {
          return Response.json({ error: "Loyalty not configured" }, { status: 500 });
        }
        const result = await lookupBalanceByPhone({ token, phone: value });
        if (!result) {
          return Response.json({ error: "Lookup failed" }, { status: 502 });
        }
        return Response.json(result);
      },
    },
  },
});

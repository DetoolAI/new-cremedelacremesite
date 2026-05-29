import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyAdmin } from "@/lib/verify-admin";

const Schema = z.object({
  email: z.string().trim().email().max(255),
});

export const Route = createFileRoute("/api/public/check-member-eligible")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAdmin(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ eligible: false, error: "Invalid email" }, { status: 400 });
        }

        const email = parsed.data.email.toLowerCase();
        const supabase = createClient(supabaseUrl, serviceKey);

        const { data, error } = await supabase
          .from("memberships")
          .select("id, status")
          .ilike("customer_email", email)
          .in("status", ["pending", "active"])
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Eligibility check failed", error);
          return Response.json({ eligible: false, error: "Lookup failed" }, { status: 500 });
        }

        return Response.json({ eligible: !!data });
      },
    },
  },
});

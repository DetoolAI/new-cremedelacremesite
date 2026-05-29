import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";

const Schema = z.object({
  email: z.string().trim().email().max(255),
  userId: z.string().trim().max(100).optional().nullable(),
});

export const Route = createFileRoute("/api/public/notify-signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
          return Response.json({ error: "Validation failed" }, { status: 400 });
        }
        const { email, userId } = parsed.data;

        const supabase = createClient(supabaseUrl, serviceKey);

        try {
          await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              template_name: "account-signup",
              recipient_email: ADMIN_EMAIL,
              idempotency_key: `signup-admin-${userId ?? email}`,
              message_id: crypto.randomUUID(),
              template_data: {
                signupEmail: email,
                signupTime: new Date().toISOString(),
                userId: userId ?? undefined,
              },
            } as never,
          });
        } catch (err) {
          console.error("Failed to enqueue signup notification", err);
        }

        return Response.json({ success: true });
      },
    },
  },
});

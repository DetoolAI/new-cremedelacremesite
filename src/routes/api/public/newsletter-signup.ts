import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";

const Schema = z.object({
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().nullable(),
  name: z.string().trim().max(200).optional().nullable(),
});

export const Route = createFileRoute("/api/public/newsletter-signup")({
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
          return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
        }
        const { email, phone, name } = parsed.data;

        const supabase = createClient(supabaseUrl, serviceKey);

        // Insert a lead. Use signup_type 'newsletter' so it shows up in admin.
        const { data: inserted, error: insErr } = await supabase
          .from("leads")
          .insert({
            name: name || email.split("@")[0],
            email: email.toLowerCase(),
            phone: phone || null,
            signup_type: "newsletter",
            status: "new",
            notes: "Joined Nails Club from homepage",
          })
          .select()
          .single();

        if (insErr) {
          console.error("Newsletter signup insert failed", insErr);
          return Response.json({ error: "Could not save signup" }, { status: 500 });
        }

        // Notify admin + send welcome email (best-effort, never block success)
        const enqueue = async (recipient: string, isAdmin: boolean) => {
          try {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                template_name: "newsletter-signup",
                recipient_email: recipient,
                idempotency_key: `newsletter-${inserted.id}-${isAdmin ? "admin" : "customer"}`,
                message_id: crypto.randomUUID(),
                template_data: {
                  signupEmail: email,
                  signupPhone: phone ?? undefined,
                  signupName: name ?? undefined,
                  isAdmin,
                },
              } as never,
            });
          } catch (err) {
            console.error("Failed to enqueue newsletter email", err);
          }
        };
        await Promise.all([
          enqueue(ADMIN_EMAIL, true),
          enqueue(email, false),
        ]);

        return Response.json({ success: true, id: inserted.id });
      },
    },
  },
});

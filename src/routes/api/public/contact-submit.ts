import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";

const Schema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(50),
  service: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preferred_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  staff_name: z.string().trim().max(100).optional().nullable(),
});

export const Route = createFileRoute("/api/public/contact-submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
        }

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Validation failed", details: parsed.error.issues }, { status: 400 });
        }
        const d = parsed.data;

        const supabase = createClient(supabaseUrl, serviceKey);

        const { data: inserted, error: insErr } = await supabase
          .from("contact_submissions")
          .insert({
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email.toLowerCase(),
            phone: d.phone,
            service: d.service,
            notes: d.notes ?? null,
            staff_name: d.staff_name ?? null,
            preferred_date: d.preferred_date ?? null,
            preferred_time: d.preferred_time ?? null,
            status: "new",
          })
          .select()
          .single();

        if (insErr || !inserted) {
          console.error("Contact submit insert failed", insErr);
          return Response.json({ ok: false, error: "Could not save inquiry" }, { status: 500 });
        }

        try {
          await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              template_name: "contact-inquiry",
              recipient_email: ADMIN_EMAIL,
              idempotency_key: `contact-${inserted.id}`,
              message_id: crypto.randomUUID(),
              template_data: {
                customerName: `${d.first_name} ${d.last_name}`,
                customerEmail: d.email,
                customerPhone: d.phone,
                service: d.service,
                notes: d.notes ?? undefined,
                timestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
              },
            } as never,
          });
        } catch (err) {
          console.error("Failed to enqueue contact-inquiry email", err);
        }

        return Response.json({ ok: true, id: inserted.id });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";

const Schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(50),
  event_type: z.enum(["birthday", "bridal", "bachelorette", "corporate", "private_party", "other"]),
  location: z.enum(["in_salon", "mobile_on_location"]),
  group_size: z.string().trim().min(1).max(20),
  services: z.string().trim().min(1).max(500),
  date_range: z.string().trim().min(1).max(200),
  message: z.string().trim().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/party-inquiry")({
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
        const d = parsed.data;

        const supabase = createClient(supabaseUrl, serviceKey);

        const eventLabel: Record<string, string> = {
          birthday: "Birthday Party",
          bridal: "Bridal Party",
          bachelorette: "Bachelorette",
          corporate: "Corporate / Group Event",
          private_party: "Private Party",
          other: "Other",
        };
        const locationLabel = d.location === "mobile_on_location" ? "Mobile / On-Location" : "In Salon";

        const summary =
          `Event: ${eventLabel[d.event_type]}\n` +
          `Location: ${locationLabel}\n` +
          `Group size: ${d.group_size}\n` +
          `Services requested: ${d.services}\n` +
          `Preferred date(s): ${d.date_range}\n` +
          (d.message ? `\nMessage:\n${d.message}` : "");

        const { data: inserted, error: insErr } = await supabase
          .from("leads")
          .insert({
            name: d.name,
            email: d.email.toLowerCase(),
            phone: d.phone,
            signup_type: "other",
            status: "new",
            notes: `[${eventLabel[d.event_type]} inquiry]\n${summary}`,
            metadata: {
              kind: "party_inquiry",
              event_type: d.event_type,
              location: d.location,
              group_size: d.group_size,
              services: d.services,
              date_range: d.date_range,
              message: d.message ?? null,
            },
          })
          .select()
          .single();

        if (insErr || !inserted) {
          console.error("Party inquiry insert failed", insErr);
          return Response.json({ error: "Could not save inquiry" }, { status: 500 });
        }

        // Email Angie + send confirmation to client (best-effort)
        const enqueue = async (recipient: string, isAdmin: boolean) => {
          try {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                template_name: "party-inquiry",
                recipient_email: recipient,
                idempotency_key: `party-${inserted.id}-${isAdmin ? "admin" : "customer"}`,
                message_id: crypto.randomUUID(),
                template_data: {
                  isAdmin,
                  customerName: d.name,
                  customerEmail: d.email,
                  customerPhone: d.phone,
                  eventType: eventLabel[d.event_type],
                  location: locationLabel,
                  groupSize: d.group_size,
                  services: d.services,
                  dateRange: d.date_range,
                  message: d.message ?? undefined,
                },
              } as never,
            });
          } catch (err) {
            console.error("Failed to enqueue party-inquiry email", err);
          }
        };
        await Promise.all([
          enqueue(ADMIN_EMAIL, true),
          enqueue(d.email, false),
        ]);

        return Response.json({ success: true, id: inserted.id });
      },
    },
  },
});

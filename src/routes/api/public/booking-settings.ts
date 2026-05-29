import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public read of booking-related settings (e.g. how far in advance clients can book).
// Safe to expose — no secrets, just config the booking modal needs.
export const Route = createFileRoute("/api/public/booking-settings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { data } = await supabaseAdmin
            .from("site_settings")
            .select("value")
            .eq("key", "booking")
            .maybeSingle();
          const value = (data?.value ?? {}) as { max_advance_days?: number };
          return Response.json({
            max_advance_days: typeof value.max_advance_days === "number" ? value.max_advance_days : 60,
          });
        } catch {
          return Response.json({ max_advance_days: 60 });
        }
      },
    },
  },
});

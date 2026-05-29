import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BodySchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 10 || d.length === 11;
    }, "Phone must be 10 or 11 digits"),
  channel: z.enum(["branded", "backup"]).default("branded"),
});

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

// Simple in-memory rate limit: phone -> last request timestamp (ms)
const RATE_LIMIT_MS = 60_000;
const recentRequests = new Map<string, number>();

const REDIRECT_TO = "https://cremedelacremenails.com/member-book";

export const Route = createFileRoute("/api/public/member-magic-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Please enter a valid phone number." },
            { status: 400 },
          );
        }

        const normalized = normalizePhone(parsed.data.phone);
        const channel = parsed.data.channel;
        const targetDigits = digitsOnly(normalized);

        // Rate limit per normalized phone
        const now = Date.now();
        const rateLimitKey = `${channel}:${normalized}`;
        const last = recentRequests.get(rateLimitKey);
        if (last && now - last < RATE_LIMIT_MS) {
          return Response.json(
            { ok: false, error: "Please wait before requesting another link." },
            { status: 429 },
          );
        }

        // Look up membership by phone (compare digits-only to tolerate format drift)
        const { data: rows, error: lookupError } = await supabaseAdmin
          .from("memberships")
          .select("id, customer_email, customer_phone, customer_first_name, status")
          .in("status", ["active", "pending"])
          .order("enrolled_at", { ascending: false })
          .limit(2000);
        if (lookupError) {
          console.error("member-magic-link lookup failed", lookupError);
          return Response.json({ ok: false, error: "Lookup failed" }, { status: 500 });
        }
        const match = (rows ?? []).find((r) => {
          const d = digitsOnly(r.customer_phone);
          return d === targetDigits || (d.length === 10 && `1${d}` === targetDigits) || (targetDigits.length === 10 && `1${targetDigits}` === d);
        });

        if (!match || !match.customer_email) {
          return Response.json({ ok: false, error: "No membership found" }, { status: 404 });
        }

        if (channel === "backup") {
          const supabaseUrl = process.env.SUPABASE_URL;
          const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !publishableKey) {
            return Response.json({ ok: false, error: "Backup sign-in is not configured" }, { status: 500 });
          }
          const authClient = createClient(supabaseUrl, publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { error: otpError } = await authClient.auth.signInWithOtp({
            email: match.customer_email,
            options: { emailRedirectTo: REDIRECT_TO, shouldCreateUser: true },
          });
          if (otpError) {
            console.error("backup member sign-in failed", otpError);
            return Response.json({ ok: false, error: "Could not send backup sign-in link" }, { status: 500 });
          }

          recentRequests.set(rateLimitKey, now);
          return Response.json({ ok: true });
        }

        // Generate a magic link via Supabase Admin
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: match.customer_email,
          options: { redirectTo: REDIRECT_TO },
        });
        if (linkError || !linkData?.properties?.action_link) {
          console.error("generateLink failed", linkError);
          return Response.json({ ok: false, error: "Could not generate sign-in link" }, { status: 500 });
        }

        const magicLink = linkData.properties.action_link;

        // Enqueue the branded magic-link email (fire-and-forget)
        Promise.resolve(supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            template_name: "member-magic-link",
            recipient_email: match.customer_email,
            idempotency_key: `member-magic-${match.id}-${now}`,
            message_id: crypto.randomUUID(),
            template_data: {
              firstName: match.customer_first_name ?? "",
              magicLink,
            },
          } as never,
        })).then(({ error: emailErr }) => {
          if (emailErr) console.error("Failed to enqueue magic-link email", emailErr);
        }).catch((e: unknown) => console.error("Failed to enqueue magic-link email", e));

        recentRequests.set(rateLimitKey, now);
        // Opportunistic cleanup of stale entries
        if (recentRequests.size > 5000) {
          for (const [k, t] of recentRequests) {
            if (now - t > RATE_LIMIT_MS) recentRequests.delete(k);
          }
        }

        // Never reveal email
        return Response.json({ ok: true });
      },
    },
  },
});

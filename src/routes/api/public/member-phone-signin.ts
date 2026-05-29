import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
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
  lastName: z.string().trim().min(1).max(100),
});

function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z]/g, "");
}

const RATE_LIMIT_MS = 5_000;
const recentRequests = new Map<string, number>();

const REDIRECT_TO = "https://cremedelacremenails.com/member-book";

export const Route = createFileRoute("/api/public/member-phone-signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Please enter your phone and last name." },
            { status: 400 },
          );
        }

        const targetDigits = digitsOnly(parsed.data.phone);
        const lastNameNorm = normalizeName(parsed.data.lastName);

        const ipKey = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "anon";
        const rateKey = `${ipKey}:${targetDigits}`;
        const now = Date.now();
        const last = recentRequests.get(rateKey);
        if (last && now - last < RATE_LIMIT_MS) {
          return Response.json(
            { ok: false, error: "Please wait a moment and try again." },
            { status: 429 },
          );
        }
        recentRequests.set(rateKey, now);

        const { data: rows, error: lookupError } = await supabaseAdmin
          .from("memberships")
          .select("id, customer_email, customer_phone, customer_first_name, customer_last_name, status")
          .in("status", ["active", "pending"])
          .order("enrolled_at", { ascending: false })
          .limit(5000);
        if (lookupError) {
          console.error("member-phone-signin lookup failed", lookupError);
          return Response.json({ ok: false, error: "Sign-in failed" }, { status: 500 });
        }

        const match = (rows ?? []).find((r) => {
          const d = digitsOnly(r.customer_phone);
          const phoneOk =
            d === targetDigits ||
            (d.length === 10 && `1${d}` === targetDigits) ||
            (targetDigits.length === 10 && `1${targetDigits}` === d);
          if (!phoneOk) return false;
          return normalizeName(r.customer_last_name ?? "") === lastNameNorm;
        });

        if (!match || !match.customer_email) {
          return Response.json(
            { ok: false, error: "We couldn't find a membership matching that phone and last name." },
            { status: 404 },
          );
        }

        const email = match.customer_email;

        // Ensure the auth user exists so generateLink succeeds
        try {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
          // Cheap existence probe — use getUserByEmail-like via listUsers filter not supported,
          // fall back to attempting createUser and ignoring "already registered" errors.
          void existing;
        } catch {
          // ignore
        }
        try {
          await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
          });
        } catch {
          // user likely already exists — that's fine
        }

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: REDIRECT_TO },
        });
        if (linkError || !linkData?.properties?.hashed_token) {
          console.error("generateLink failed", linkError);
          return Response.json({ ok: false, error: "Could not sign you in" }, { status: 500 });
        }

        // Cleanup
        if (recentRequests.size > 5000) {
          for (const [k, t] of recentRequests) {
            if (now - t > RATE_LIMIT_MS) recentRequests.delete(k);
          }
        }

        return Response.json({
          ok: true,
          email,
          tokenHash: linkData.properties.hashed_token,
        });
      },
    },
  },
});

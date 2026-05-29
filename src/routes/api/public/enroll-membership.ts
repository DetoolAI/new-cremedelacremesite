import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ADMIN_EMAIL = "angie@cremedelacremenails.com";

// Map each membership tier to its Square subscription plan variation and monthly price.
// Square's Subscriptions API requires the variation ID, not the parent plan ID.
// Tiers are listed in alphabetical order to match the Square plan list.
const TIER_CONFIG: Record<string, { priceCents: number; planVariationId: string }> = {
  "2× Builder Gel + 2× Regular Pedi": {
    priceCents: 20000,
    planVariationId: "7IWIPR6N45KBG7O4P64PI35H",
  },
  "2× Long Acrylic Refill + Regular Pedi": {
    priceCents: 16200,
    planVariationId: "UVG3LRQ54EWU6WIPRROTTMST",
  },
  "2× Builder Gel + Gel Pedi": { priceCents: 18000, planVariationId: "IYCG342PXLDPQOWUSKJDZJOR" },
  "Acrylic Cover Backfill S–M": { priceCents: 12000, planVariationId: "WTR45BNIBH25ID434Y2LPRHS" },
  "Acrylic Refill + Gel Pedi": { priceCents: 16200, planVariationId: "YIR27T6MQTISHOFY24TJ2TLV" },
  "Basic — Mani & Pedi": { priceCents: 9300, planVariationId: "F3XUQDR763MA3LDWMDHX2RJE" },
  "Buff Mani & Pedi": { priceCents: 8500, planVariationId: "PPGGAR6HYTNEKFM7I7NGYYTU" },
  "Buff Manicure Only": { priceCents: 4500, planVariationId: "ZC6E6HYMPYZMI3LL4BQ5UZCI" },
  "Builder Gel + Gel Pedi": { priceCents: 11300, planVariationId: "XNDTYZQZA7LWU42XPAEOP6T2" },
  "Gel Mani & Gel Pedi": { priceCents: 12000, planVariationId: "LHMADWCFCH4G6V2Y4B4GM4TL" },
  "Gel Mani + Regular Pedi": { priceCents: 14500, planVariationId: "ZQBH53JGKFGPRROQWKPUM35L" },
  "Gel Mani + Regular Pedi (Lite)": {
    priceCents: 11000,
    planVariationId: "M6IVANQRPCDREW65NWOVAKH7",
  },
  "Premium Gel Mani & Pedi": { priceCents: 19000, planVariationId: "H2HLHUT76BRJNSGZ2OOOYIMV" },
  "Premium Spa Gel Pedicure + Soak Off": {
    priceCents: 7800,
    planVariationId: "O6MORF564QGMLPRU5QO4VWGK",
  },
  "Premium Spa Pedi + Mani Gel": { priceCents: 16000, planVariationId: "S3YWQTOS5PPQLJHHEW5SQPF2" },
  "Protein Gel Mani & Spa Gel Pedi": {
    priceCents: 16500,
    planVariationId: "MHUYBWY52X27OVXRTY53N4QG",
  },
  "Regular Pedi Only": { priceCents: 6600, planVariationId: "6SZ7XSKP2UA6GEQS2IBFLBFV" },
  "Russian Acrylic Refill + Regular Pedi": {
    priceCents: 19000,
    planVariationId: "5U7QCRWEYLDQHDJD4V7KTP6S",
  },
  "Russian Buff Manicures": { priceCents: 6500, planVariationId: "BY5SFSY6P3BB5OO6LWSE7T6Y" },
  "Russian Gel Mani & Pedi": { priceCents: 12000, planVariationId: "VNY6RZVIZKMGDA54RLRNJNIS" },
  "Russian Gel-X Extensions + Gel Pedi": {
    priceCents: 16000,
    planVariationId: "UZ5VSWJ5GT3ZQF43VIHD7LEB",
  },
  "Russian Hardgel Overlay + Russian Gel Pedi": {
    priceCents: 16500,
    planVariationId: "Z3YBP5VKK27DAJ35RVGZYKVZ",
  },
  "Russian Mani + Gel Pedi": { priceCents: 16000, planVariationId: "CMVE6DLNB5XBCDNGXTRI3GWO" },
};

const MEMBERSHIP_AMOUNT_ITEM_VARIATION_ID = "RXNPWRVTKCR5DSCWYQW2ZHCI";

const Schema = z.object({
  source_id: z.string().min(1).max(500),
  idempotency_key: z.string().min(8).max(128),
  enrollment: z.object({
    customer_first_name: z.string().trim().min(1).max(100),
    customer_last_name: z.string().trim().min(1).max(100),
    customer_email: z.string().trim().email().max(255),
    customer_phone: z.string().trim().min(5).max(50),
    billing_address_line1: z.string().trim().min(1).max(200),
    billing_address_line2: z.string().trim().max(200).nullable().optional(),
    billing_city: z.string().trim().min(1).max(100),
    billing_state: z.string().trim().min(2).max(50),
    billing_postal_code: z.string().trim().min(3).max(20),
    billing_country: z.string().trim().length(2).default("US"),
    tier_name: z.string().trim().min(1).max(100),
    notes: z.string().trim().max(2000).nullable().optional(),
    customer_initials: z.string().trim().min(1).max(10).optional(),
    signature_data_url: z.string().max(200000).optional(),
  }),
});

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function createSubscriptionOrderTemplate(args: {
  headers: Record<string, string>;
  idempotencyKey: string;
  locationId: string;
  tierName: string;
  priceCents: number;
}) {
  const orderRes = await fetch("https://connect.squareup.com/v2/orders", {
    method: "POST",
    headers: args.headers,
    body: JSON.stringify({
      idempotency_key: `order-${args.idempotencyKey}`,
      order: {
        location_id: args.locationId,
        state: "DRAFT",
        line_items: [
          {
            quantity: "1",
            catalog_object_id: MEMBERSHIP_AMOUNT_ITEM_VARIATION_ID,
            name: `${args.tierName} Membership`,
            base_price_money: { amount: args.priceCents, currency: "USD" },
          },
        ],
      },
    }),
  });
  const orderJson = (await orderRes.json()) as {
    order?: { id: string };
    errors?: Array<{ detail?: string; code?: string; field?: string }>;
  };
  if (!orderRes.ok || !orderJson.order?.id) {
    throw new Error(
      orderJson.errors
        ?.map(
          (er) =>
            `${er.code ?? "ERR"}: ${er.detail ?? "unknown"}${er.field ? ` (${er.field})` : ""}`,
        )
        .join(" | ") ?? `Order HTTP ${orderRes.status}`,
    );
  }
  return orderJson.order.id;
}

export const Route = createFileRoute("/api/public/enroll-membership")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const squareToken = process.env.SQUARE_ACCESS_TOKEN;
        const squareLocation = process.env.SQUARE_LOCATION_ID;
        if (!supabaseUrl || !serviceKey || !squareToken || !squareLocation) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const { source_id, idempotency_key, enrollment: e } = parsed.data;

        const tier = TIER_CONFIG[e.tier_name];
        if (!tier) {
          return Response.json(
            { error: `Unknown membership tier: ${e.tier_name}` },
            { status: 400 },
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const SQ_HEADERS = {
          Authorization: `Bearer ${squareToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-10-17",
        };
        const SQ_BASE = "https://connect.squareup.com/v2";

        // 1. Create or look up Square Customer
        let squareCustomerId: string | null = null;
        try {
          const cRes = await fetch(`${SQ_BASE}/customers`, {
            method: "POST",
            headers: SQ_HEADERS,
            body: JSON.stringify({
              idempotency_key: `cust-${idempotency_key}`,
              given_name: e.customer_first_name,
              family_name: e.customer_last_name,
              email_address: e.customer_email,
              phone_number: e.customer_phone,
              address: {
                address_line_1: e.billing_address_line1,
                address_line_2: e.billing_address_line2 ?? undefined,
                locality: e.billing_city,
                administrative_district_level_1: e.billing_state,
                postal_code: e.billing_postal_code,
                country: e.billing_country,
              },
            }),
          });
          const cJson = (await cRes.json()) as {
            customer?: { id: string };
            errors?: Array<{ detail?: string }>;
          };
          if (!cRes.ok || !cJson.customer?.id) {
            console.error("Square customer create failed", cJson);
            return Response.json(
              { error: cJson.errors?.[0]?.detail ?? "Could not create customer" },
              { status: 502 },
            );
          }
          squareCustomerId = cJson.customer.id;
        } catch (err) {
          console.error("Square customer error", err);
          return Response.json({ error: "Payment service unavailable" }, { status: 502 });
        }

        // 2. Save card on file
        let squareCardId: string | null = null;
        try {
          const cardRes = await fetch(`${SQ_BASE}/cards`, {
            method: "POST",
            headers: SQ_HEADERS,
            body: JSON.stringify({
              idempotency_key: `card-${idempotency_key}`,
              source_id,
              card: {
                customer_id: squareCustomerId,
                billing_address: {
                  address_line_1: e.billing_address_line1,
                  address_line_2: e.billing_address_line2 ?? undefined,
                  locality: e.billing_city,
                  administrative_district_level_1: e.billing_state,
                  postal_code: e.billing_postal_code,
                  country: e.billing_country,
                },
                cardholder_name: `${e.customer_first_name} ${e.customer_last_name}`,
              },
            }),
          });
          const cardJson = (await cardRes.json()) as {
            card?: { id: string };
            errors?: Array<{ detail?: string }>;
          };
          if (!cardRes.ok || !cardJson.card?.id) {
            console.error("Square card-on-file failed", cardJson);
            return Response.json(
              { error: cardJson.errors?.[0]?.detail ?? "Card was declined" },
              { status: 402 },
            );
          }
          squareCardId = cardJson.card.id;
        } catch (err) {
          console.error("Square card error", err);
          return Response.json({ error: "Could not save card" }, { status: 502 });
        }

        // 3. Compute renewal anchor: subscription always renews on the 1st of each month.
        // If today isn't the 1st, charge the first month immediately via a one-time payment,
        // then start the recurring subscription on the next 1st of the month.
        // Use NY local date (not UTC) — at e.g. 11pm ET on the 31st, UTC is
        // already the 1st of next month, which would skip the first-month charge.
        const today = new Date();
        const nyParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(today);
        const nyGet = (t: string) => Number(nyParts.find((p) => p.type === t)?.value ?? 0);
        const nyYear = nyGet("year");
        const nyMonth = nyGet("month"); // 1-12
        const nyDay = nyGet("day");
        const isFirstOfMonth = nyDay === 1;
        // Subscription start date is a calendar date (no time), so building it
        // from NY year/month is correct regardless of UTC.
        const nextMonthYear = nyMonth === 12 ? nyYear + 1 : nyYear;
        const nextMonth = nyMonth === 12 ? 1 : nyMonth + 1;
        const subscriptionStartDate = isFirstOfMonth
          ? `${nyYear}-${String(nyMonth).padStart(2, "0")}-01`
          : `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;

        // 3a. If we're not already on the 1st, charge first month now so the customer
        // pays today and renewals continue on the 1st going forward.
        if (!isFirstOfMonth) {
          try {
            const payRes = await fetch(`${SQ_BASE}/payments`, {
              method: "POST",
              headers: SQ_HEADERS,
              body: JSON.stringify({
                idempotency_key: `pay-${idempotency_key}`,
                source_id: squareCardId,
                customer_id: squareCustomerId,
                location_id: squareLocation,
                amount_money: { amount: tier.priceCents, currency: "USD" },
                autocomplete: true,
                note: `${e.tier_name} membership — first month (renews 1st of each month)`,
              }),
            });
            const payJson = (await payRes.json()) as {
              payment?: { id: string; status: string };
              errors?: Array<{ detail?: string; code?: string }>;
            };
            if (!payRes.ok || payJson.payment?.status !== "COMPLETED") {
              console.error("Square first-month charge failed", payJson);
              return Response.json(
                {
                  error:
                    payJson.errors?.[0]?.detail ?? "Card was declined for the first month charge",
                },
                { status: 402 },
              );
            }
          } catch (err) {
            console.error("Square first-month payment error", err);
            return Response.json({ error: "Could not charge first month" }, { status: 502 });
          }
        }

        // 3b. Create the recurring Subscription anchored to the 1st of the month.
        let squareSubscriptionId: string | null = null;
        let subscriptionStatus: string = "pending";
        try {
          const orderTemplateId = await createSubscriptionOrderTemplate({
            headers: SQ_HEADERS,
            idempotencyKey: idempotency_key,
            locationId: squareLocation,
            tierName: e.tier_name,
            priceCents: tier.priceCents,
          });
          const sRes = await fetch(`${SQ_BASE}/subscriptions`, {
            method: "POST",
            headers: SQ_HEADERS,
            body: JSON.stringify({
              idempotency_key: `sub-${idempotency_key}`,
              location_id: squareLocation,
              customer_id: squareCustomerId,
              plan_variation_id: tier.planVariationId,
              card_id: squareCardId,
              start_date: subscriptionStartDate, // 1st of next month (or today if already the 1st)
              phases: [{ ordinal: 0, order_template_id: orderTemplateId }],
            }),
          });
          const sJson = (await sRes.json()) as {
            subscription?: { id: string; status: string };
            errors?: Array<{ detail?: string; code?: string; field?: string }>;
          };
          if (!sRes.ok || !sJson.subscription?.id) {
            const detail =
              sJson.errors
                ?.map(
                  (er) =>
                    `${er.code ?? "ERR"}: ${er.detail ?? "unknown"}${er.field ? ` (${er.field})` : ""}`,
                )
                .join(" | ") ?? `HTTP ${sRes.status}`;
            console.error("Square subscription create failed", {
              tierName: e.tier_name,
              planVariationId: tier.planVariationId,
              detail,
              response: sJson,
            });
            return Response.json(
              {
                error:
                  "We could not start the monthly membership billing automatically. Your membership was not completed; please try again or contact the salon.",
              },
              { status: 502 },
            );
          }
          squareSubscriptionId = sJson.subscription.id;
          subscriptionStatus = sJson.subscription.status?.toLowerCase() ?? "active";
        } catch (err) {
          console.error("Square subscription error", {
            tierName: e.tier_name,
            planVariationId: tier.planVariationId,
            err,
          });
          return Response.json(
            {
              error:
                "We could not start the monthly membership billing automatically. Your membership was not completed; please try again or contact the salon.",
            },
            { status: 502 },
          );
        }

        // 4. Record enrollment
        const { data: inserted, error: insErr } = await supabase
          .from("memberships")
          .insert({
            customer_first_name: e.customer_first_name,
            customer_last_name: e.customer_last_name,
            customer_email: e.customer_email,
            customer_phone: e.customer_phone,
            billing_address_line1: e.billing_address_line1,
            billing_address_line2: e.billing_address_line2 ?? null,
            billing_city: e.billing_city,
            billing_state: e.billing_state,
            billing_postal_code: e.billing_postal_code,
            billing_country: e.billing_country,
            tier_name: e.tier_name,
            monthly_price_cents: tier.priceCents,
            square_customer_id: squareCustomerId,
            square_card_id: squareCardId,
            square_subscription_id: squareSubscriptionId,
            square_plan_variation_id: tier.planVariationId ?? null,
            status: subscriptionStatus,
            notes: e.notes ?? null,
            customer_initials: e.customer_initials ?? null,
            signature_data_url: e.signature_data_url ?? null,
            signed_at: e.signature_data_url ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (insErr || !inserted) {
          console.error("CRITICAL: Square set up but DB insert failed", {
            squareCustomerId,
            squareCardId,
            squareSubscriptionId,
            insErr,
          });

          // Rollback: cancel the Square subscription so the customer isn't
          // billed for a membership we never recorded. Card-on-file and
          // customer record are left in place (harmless without subscription).
          let rollbackOk = false;
          let rollbackError: string | null = null;
          if (squareSubscriptionId) {
            try {
              const cancelRes = await fetch(
                `${SQ_BASE}/subscriptions/${squareSubscriptionId}/cancel`,
                { method: "POST", headers: SQ_HEADERS },
              );
              const cancelJson = (await cancelRes.json()) as {
                subscription?: { id: string; status: string };
                errors?: Array<{ detail?: string; code?: string }>;
              };
              if (cancelRes.ok && cancelJson.subscription) {
                rollbackOk = true;
              } else {
                rollbackError =
                  cancelJson.errors?.map((er) => er.detail ?? er.code ?? "unknown").join(" | ") ??
                  `HTTP ${cancelRes.status}`;
                console.error("Square subscription rollback failed", {
                  squareSubscriptionId,
                  rollbackError,
                });
              }
            } catch (cancelErr) {
              rollbackError = cancelErr instanceof Error ? cancelErr.message : "unknown";
              console.error("Square subscription rollback exception", {
                squareSubscriptionId,
                cancelErr,
              });
            }
          }

          const ref = squareSubscriptionId ?? squareCardId;
          const message = rollbackOk
            ? "We couldn't record your enrollment, so we've cancelled the pending Square subscription. You will not be billed. Please try again or contact the salon."
            : `Your card was saved with Square but we couldn't record your enrollment. Please contact us with this reference: ${ref}`;

          return Response.json(
            {
              error: message,
              rollback: { attempted: !!squareSubscriptionId, ok: rollbackOk, error: rollbackError },
              reference: ref,
            },
            { status: 500 },
          );
        }

        // 5. Upload signature to public storage so it renders in email clients
        // (most clients like Gmail strip data: URI images).
        let signaturePublicUrl: string | undefined;
        if (e.signature_data_url && e.signature_data_url.startsWith("data:image/")) {
          try {
            const match = e.signature_data_url.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              const ext = match[1] === "jpeg" ? "jpg" : match[1];
              const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
              const path = `signatures/${inserted.id}.${ext}`;
              const { error: upErr } = await supabase.storage
                .from("site-media")
                .upload(path, bytes, { contentType: `image/${match[1]}`, upsert: true });
              if (!upErr) {
                const { data: pub } = supabase.storage.from("site-media").getPublicUrl(path);
                signaturePublicUrl = pub.publicUrl;
              } else {
                console.error("Signature upload failed", upErr);
              }
            }
          } catch (err) {
            console.error("Signature upload exception", err);
          }
        }

        // 6. Send emails (customer + admin)
        const origin = new URL(request.url).origin;
        const PUBLIC_SITE = "https://cremedelacremenails.com";
        const membershipCardUrl = `${PUBLIC_SITE}/membership-card?id=${inserted.id}`;
        const memberPortalUrl = `${PUBLIC_SITE}/member-login?mode=signup&email=${encodeURIComponent(e.customer_email)}`;
        const logoUrl = `${origin}/email-logo.png`;

        const sendEmail = async (recipient: string, isAdmin: boolean) => {
          try {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                template_name: "membership-enrollment",
                recipient_email: recipient,
                idempotency_key: `membership-${inserted.id}-${isAdmin ? "admin" : "customer"}`,
                message_id: crypto.randomUUID(),
                template_data: {
                  customerName: `${e.customer_first_name} ${e.customer_last_name}`,
                  customerEmail: e.customer_email,
                  phone: e.customer_phone,
                  tierName: e.tier_name,
                  monthlyPrice: formatMoney(tier.priceCents),
                  billingAddress: [
                    e.billing_address_line1,
                    e.billing_address_line2,
                    `${e.billing_city}, ${e.billing_state} ${e.billing_postal_code}`,
                    e.billing_country,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  notes: e.notes ?? undefined,
                  customerInitials: e.customer_initials ?? undefined,
                  signatureDataUrl: signaturePublicUrl ?? e.signature_data_url ?? undefined,
                  amountCharged: formatMoney(tier.priceCents),
                  signedAt: e.signature_data_url ? new Date().toISOString() : undefined,
                  isAdmin,
                  subscriptionStatus,
                  squareSubscriptionId: squareSubscriptionId ?? undefined,
                  membershipCardUrl,
                  memberPortalUrl,
                  membershipId: inserted.id,
                  billingCadence: "Auto-renews on the 1st of every month",
                  logoUrl,
                },
              } as never,
            });
          } catch (err) {
            console.error("Failed to enqueue membership email", err);
          }
        };
        await Promise.all([sendEmail(e.customer_email, false), sendEmail(ADMIN_EMAIL, true)]);

        return Response.json({
          success: true,
          id: inserted.id,
          membership_card_url: membershipCardUrl,
          square_customer_id: squareCustomerId,
          square_subscription_id: squareSubscriptionId,
          status: subscriptionStatus,
          monthly_price_cents: tier.priceCents,
        });
      },
    },
  },
});

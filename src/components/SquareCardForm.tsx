import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Square?: any;
  }
}

interface Props {
  onPaid: (sourceId: string, idempotencyKey: string) => Promise<void>;
  submitting: boolean;
  amountLabel: string;
  amountCents: number;
  buyer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  summary?: React.ReactNode;
  buttonLabel?: string;
  recurring?: boolean;
  onPaymentStart?: () => void;
  onPaymentEnd?: () => void;
}

const SDK_URL_PROD = "https://web.squarecdn.com/v1/square.js";

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Square) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL_PROD}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("SDK failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL_PROD;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("SDK failed to load"));
    document.head.appendChild(s);
  });
}

export function SquareCardForm({
  onPaid,
  submitting,
  amountLabel,
  amountCents,
  buyer,
  summary,
  buttonLabel,
  recurring = false,
  onPaymentStart,
  onPaymentEnd,
}: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState({
    googlePay: false,
    afterpay: false,
  });
  const payingRef = useRef(false);
  const cardInstanceRef = useRef<any>(null);
  const onPaidRef = useRef(onPaid);
  const amountCentsRef = useRef(amountCents);
  const buyerRef = useRef(buyer);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);
  useEffect(() => {
    amountCentsRef.current = amountCents;
  }, [amountCents]);
  useEffect(() => {
    buyerRef.current = buyer;
  }, [buyer]);
  const containerId = "square-card-container";
  const googlePayId = "square-google-pay";
  const applePayId = "square-apple-pay";
  const afterpayId = "square-afterpay";

  const buildPaymentRequest = (payments: any) => {
    const total = (amountCentsRef.current / 100).toFixed(2);
    const b = buyerRef.current;
    return payments.paymentRequest({
      countryCode: "US",
      currencyCode: "USD",
      total: { amount: total, label: recurring ? "Membership" : "Deposit" },
      ...(b
        ? {
            requestBillingContact: true,
            requestShippingContact: false,
            shippingContact: undefined,
            billingContact: {
              ...(b.firstName ? { givenName: b.firstName } : {}),
              ...(b.lastName ? { familyName: b.lastName } : {}),
              ...(b.email ? { email: b.email } : {}),
              ...(b.phone ? { phone: b.phone } : {}),
              ...(b.countryCode ? { countryCode: b.countryCode } : {}),
            },
          }
        : {}),
    });
  };

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => Promise<void> | void> = [];

    (async () => {
      try {
        const cfgRes = await fetch("/api/public/square-config");
        const cfg = await cfgRes.json();
        if (!cfgRes.ok) throw new Error(cfg?.error ?? "Could not load payment config");
        await loadSdk();
        if (cancelled || !window.Square) return;

        const payments = window.Square.payments(cfg.applicationId, cfg.locationId);

        const card = await payments.card();
        await card.attach(`#${containerId}`);
        if (cancelled) {
          await card.destroy().catch(() => {});
          return;
        }
        cardInstanceRef.current = card;
        cleanups.push(() => card.destroy().catch(() => {}));
        setReady(true);

        try {
          const applePay = await payments.applePay(buildPaymentRequest(payments));
          const applePayBtn = document.getElementById(applePayId);
          if (applePayBtn) {
            applePayBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (payingRef.current) return;
              payingRef.current = true;
              onPaymentStart?.();
              try {
                const result = await applePay.tokenize();
                if (result.status === "OK" && result.token) {
                  const idempotencyKey = `wal-${crypto.randomUUID()}`;
                  try {
                    await onPaidRef.current(result.token, idempotencyKey);
                  } catch (err: any) {
                    setWalletError(err?.message ?? "Apple Pay payment failed");
                  }
                } else {
                  setWalletError(result.errors?.[0]?.message ?? "Apple Pay payment failed");
                }
              } catch (err: any) {
                if ((err as any)?.message?.includes("cancelled")) {
                  // user cancelled — silent, but still need to reset refs via finally
                } else {
                  setWalletError((err as any)?.message ?? "Apple Pay payment failed");
                }
              } finally {
                payingRef.current = false;
                onPaymentEnd?.();
              }
            });
          }
          cleanups.push(() => applePay.destroy?.().catch(() => {}));
        } catch (e) {
          const el = document.getElementById(applePayId);
          if (el) el.style.display = "none";
        }

        try {
          const googlePay = await payments.googlePay(buildPaymentRequest(payments));
          await googlePay.attach(`#${googlePayId}`, {
            buttonColor: "default",
            buttonType: "long",
            buttonSizeMode: "fill",
          });
          setWalletReady((p) => ({ ...p, googlePay: true }));
          cleanups.push(() => googlePay.destroy().catch(() => {}));
          attachWalletHandler(googlePayId, googlePay);
        } catch (e) {
          const el = document.getElementById(googlePayId);
          if (el) el.style.display = "none";
        }

        if (!recurring) {
          try {
            const afterpay = await payments.afterpayClearpay(buildPaymentRequest(payments));
            await afterpay.attach(`#${afterpayId}`);
            setWalletReady((p) => ({ ...p, afterpay: true }));
            cleanups.push(() => afterpay.destroy().catch(() => {}));
            attachWalletHandler(afterpayId, afterpay);
          } catch (e: any) {
            const el = document.getElementById(afterpayId);
            if (el) el.style.display = "none";
            console.warn("[Afterpay] unavailable:", e?.message ?? e);
          }
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not load payment form");
      }
    })();

    function attachWalletHandler(id: string, walletInstance: any) {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", async () => {
        try {
          if (payingRef.current) return;
          payingRef.current = true;
          onPaymentStart?.();
          const result = await walletInstance.tokenize();
          if (result.status === "OK" && result.token) {
            const idempotencyKey = `wal-${crypto.randomUUID()}`;
            try {
              await onPaidRef.current(result.token, idempotencyKey);
            } catch (err: any) {
              setWalletError(err?.message ?? "Payment failed");
            }
          } else {
            setWalletError(result.errors?.[0]?.message ?? "Payment failed");
          }
        } catch (err: any) {
          setWalletError(err?.message ?? "Payment failed");
        } finally {
          payingRef.current = false;
          onPaymentEnd?.();
        }
      });
    }

    return () => {
      cancelled = true;
      cleanups.forEach((c) => {
        try {
          c();
        } catch {}
      });
      cardInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async () => {
    setError(null);
    if (payingRef.current) return;
    if (!cardInstanceRef.current) {
      const msg = "Payment form is still loading. Please wait a moment and try again.";
      setError(msg);
      toast.error(msg);
      return;
    }
    payingRef.current = true;
    onPaymentStart?.();
    try {
      const result = await cardInstanceRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        const msg = result.errors?.[0]?.message ?? "Please check your card number, expiration date, CVV, and ZIP code.";
        setError(msg);
        toast.error("Card details couldn't be verified", { description: msg });
        return;
      }
      const idempotencyKey = `bk-${crypto.randomUUID()}`;
      await onPaidRef.current(result.token, idempotencyKey);
    } catch (e: any) {
      const msg = e?.message ?? "Payment failed. Please try again or use a different card.";
      setError(msg);
      toast.error("Payment failed", { description: msg });
    } finally {
      payingRef.current = false;
      onPaymentEnd?.();
    }
  };

  return (
    <div className="space-y-4">
      {summary ?? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Deposit due now</span>
            <span className="font-semibold text-base">{amountLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The remaining balance is paid in-salon. Deposits secure your appointment and are non-refundable for
            no-shows, lateness or last minute changes.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <style>{`
          #${applePayId} {
            display: inline-block;
            width: 100%;
            min-height: 48px;
            -webkit-appearance: -apple-pay-button;
            -apple-pay-button-type: plain;
            -apple-pay-button-style: black;
            border-radius: 6px;
            cursor: pointer;
          }
        `}</style>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <button
            id={applePayId}
            style={{ minHeight: 48, width: "100%", display: "block" }}
            aria-label="Pay with Apple Pay"
          />
          <div className="relative" style={{ minHeight: 48 }}>
            <div
              className="absolute inset-0 bg-foreground/10 animate-pulse rounded-sm"
              style={{ display: walletReady.googlePay ? "none" : "block" }}
            />
            <div id={googlePayId} style={{ minHeight: 48, width: "100%" }} />
          </div>
          <div className="relative" style={{ minHeight: 48 }}>
            <div
              className="absolute inset-0 bg-foreground/10 animate-pulse rounded-sm"
              style={{ display: walletReady.afterpay ? "none" : "block" }}
            />
            <div id={afterpayId} style={{ minHeight: 48, width: "100%" }} />
          </div>
        </div>
      </div>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or pay with card</span>
        </div>
      </div>

      <div id={containerId} className="min-h-[90px] rounded-md border p-3" />

      {!ready && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading secure payment form…
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
          {error}
        </div>
      )}
      {walletError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
          {walletError}
        </div>
      )}

      <Button onClick={handlePay} disabled={!ready || submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
          </>
        ) : (
          (buttonLabel ?? `Pay ${amountLabel} with Card`)
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Secure payment by Square. We never see your card or bank details.
      </p>
    </div>
  );
}

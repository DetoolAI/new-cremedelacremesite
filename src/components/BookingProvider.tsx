import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { BookingModal } from "./BookingModal";

type Ctx = { open: (opts?: { serviceName?: string; categorySlug?: string }) => void };

const BookingCtx = createContext<Ctx | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ serviceName?: string; categorySlug?: string }>({});

  const open = useCallback((opts?: { serviceName?: string; categorySlug?: string }) => {
    setPrefill(opts ?? {});
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <BookingCtx.Provider value={value}>
      {children}
      <BookingModal open={isOpen} onClose={() => setIsOpen(false)} prefill={prefill} />
    </BookingCtx.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingCtx);
  if (!ctx) {
    // Soft fallback so SSR / pages without provider don't crash
    return {
      open: () => {
        if (typeof window !== "undefined") {
          window.location.href = "https://cremedelacremenails.setmore.com/";
        }
      },
    };
  }
  return ctx;
}

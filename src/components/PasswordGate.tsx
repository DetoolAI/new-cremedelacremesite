import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const STORAGE_KEY = "cdlc-site-access";
const PASSWORD = "Creme2026";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Public routes that bypass the password gate (e.g., scannable QR pages).
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const publicPaths = ["/membership-card", "/staff", "/auth"];
        if (publicPaths.some((p) => path.startsWith(p))) {
          setUnlocked(true);
          return;
        }
      }
      setUnlocked(typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setUnlocked(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === PASSWORD) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
      setUnlocked(true);
      setError(null);
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  if (unlocked === null) {
    return <div className="min-h-screen bg-background" />;
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md text-center">
        <img src={logo} alt="Crème de la Crème Nails" className="mx-auto h-20 w-auto mb-8 opacity-90" />
        <p className="tracking-[0.32em] text-[0.65rem] text-gold mb-6">PRIVATE PREVIEW</p>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
          By invitation only
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Please enter the access password to continue.
        </p>

        <form onSubmit={handleSubmit} className="bg-cream border border-gold/20 p-8 text-left">
          <label className="block text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">
            Password
          </label>
          <input
            type="password"
            autoFocus
            required
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm mb-4"
          />
          {error && (
            <p className="text-sm text-destructive mb-4" role="alert">{error}</p>
          )}
          <button
            type="submit"
            className="w-full py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition"
          >
            Enter
          </button>
        </form>

        <p className="text-xs text-muted-foreground/70 mt-8">
          © {new Date().getFullYear()} Crème de la Crème Nails ®
        </p>
      </div>
    </div>
  );
}

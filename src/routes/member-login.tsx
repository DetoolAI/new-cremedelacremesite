import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

type Search = { redirect?: string };

export const Route = createFileRoute("/member-login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Member Sign In — Crème de la Crème Nails ®" },
      { name: "description", content: "Sign in to manage your Crème Society membership." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MemberLoginPage,
});

function MemberLoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/member-login" });
  const target = redirect && redirect.startsWith("/") ? redirect : "/member-book";

  const [phone, setPhone] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target });
    });
  }, [navigate, target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/public/member-phone-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, lastName }),
      });
      const json = await res.json().catch(() => ({ ok: false, error: "Network error" }));
      if (!json.ok || !json.tokenHash) {
        throw new Error(json.error || "Sign-in failed");
      }
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: json.tokenHash,
        type: "magiclink",
      });
      if (verifyErr) throw new Error(verifyErr.message || "Sign-in failed");
      navigate({ to: target, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-primary mb-2">Crème Society</p>
            <h1 className="font-serif text-3xl mb-2">Member Sign In</h1>
            <p className="text-sm text-muted-foreground">
              Enter the phone number and last name on your membership — no email or code needed.
            </p>
          </div>

          <div className="bg-cream border border-gold/20 p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">
                  Phone number
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(347) 555-1234"
                  className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign In"}
              </button>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Trouble signing in? Call us at <a href="tel:+13478808282" className="underline hover:text-gold">(347) 880-8282</a>.
              </p>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Not a member yet? <Link to="/membership" className="underline hover:text-gold">View our memberships</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

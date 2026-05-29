import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Gift, Loader2, Search, History } from "lucide-react";
import DOMPurify from "dompurify";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { usePageContent } from "@/hooks/usePageContent";

const rewardsFallback = {
  hero: {
    eyebrow: "EXCLUSIVE PERKS",
    heading: "Loyalty Rewards",
    description_html: "Earn points every time you visit — redeem them in-salon at checkout. Your balance is shared with our point-of-sale, so it stays in sync wherever you book.",
  },
  how_it_works: {
    items: [
      { title: "Visit", body: "Earn points automatically with every booking and in-salon visit." },
      { title: "Redeem", body: "Use points toward services at checkout — your technician will apply the discount." },
      { title: "Track", body: "Look up your balance any time using the phone number on your account." },
    ],
  },
  lookup: {
    heading: "Check your points",
    subheading: "Enter the phone number on your account.",
    button_label: "Look Up",
  },
  catalog: {
    heading: "Rewards",
    subheading: "Reward tiers are managed in Square — ask in-salon for the latest offers.",
    footer: "Mention your rewards at the salon — your technician will apply the discount.",
  },
};

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Loyalty Rewards — Crème de la Crème Nails ®" },
      { name: "description", content: "Earn points with every visit to Crème de la Crème Nails ® and redeem them in-salon. Your balance stays in sync with our point-of-sale." },
    ],
  }),
  component: RewardsPage,
});

type LookupResult = {
  found: boolean;
  balance: number;
  lifetimePoints: number;
  customerName?: string | null;
};

function RewardsPage() {
  const c = usePageContent("rewards", rewardsFallback);
  const HOW_ICONS = [Sparkles, Gift, History];
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/public/loyalty-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Lookup failed");
      } else {
        setResult(json as LookupResult);
      }
    } catch (err: any) {
      setError(err?.message ?? "Lookup failed");
    }

    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="tracking-luxe text-xs text-gold mb-3">{c.hero.eyebrow}</p>
            <h1 className="font-serif text-4xl md:text-5xl mb-4">{c.hero.heading}</h1>
            <p className="text-muted-foreground max-w-xl mx-auto" dangerouslySetInnerHTML={{ __html: typeof window !== "undefined" ? DOMPurify.sanitize(c.hero.description_html) : c.hero.description_html.replace(/<[^>]*>/g, "") }} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {c.how_it_works.items.map((it: any, i: number) => {
              const Icon = HOW_ICONS[i] ?? Sparkles;
              return <HowCard key={it.title} icon={<Icon className="w-5 h-5" />} title={it.title} body={it.body} />;
            })}
          </div>

          <div className="bg-cream border border-gold/20 p-6 md:p-8 mb-8">
            <h2 className="font-serif text-2xl mb-1">{c.lookup.heading}</h2>
            <p className="text-sm text-muted-foreground mb-5">{c.lookup.subheading}</p>
            <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ""))}
                placeholder="Phone number"
                className="flex-1 px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:bg-foreground transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {c.lookup.button_label}
              </button>
            </form>
            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
          </div>

          {searched && !loading && result && !result.found && (
            <div className="bg-cream border border-gold/20 p-8 text-center mb-8">
              <p className="font-serif text-2xl text-gold mb-2">No account found</p>
              <p className="text-sm text-muted-foreground">
                We couldn't find a loyalty account for <span className="text-foreground">{identifier}</span>.
                You'll be enrolled automatically the next time you book — go ahead and{" "}
                <a href="/book-now" className="text-gold underline">book now</a>.
              </p>
            </div>
          )}

          {result && result.found && (
            <div className="space-y-6 mb-12">
              <div className="bg-gradient-to-br from-cream to-background border border-gold/30 p-8 text-center">
                <p className="tracking-luxe text-[0.65rem] text-gold mb-2">CURRENT BALANCE</p>
                <p className="font-serif text-6xl text-foreground mb-1">{result.balance}</p>
                <p className="text-sm text-muted-foreground">points</p>
                <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-gold/20 text-xs text-muted-foreground">
                  <div>
                    <p className="text-foreground font-medium">{result.lifetimePoints}</p>
                    <p>Lifetime earned</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="font-serif text-2xl mb-1 text-center">{c.catalog.heading}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{c.catalog.subheading}</p>
            <p className="text-xs text-muted-foreground text-center mt-6">
              {c.catalog.footer}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function HowCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-cream border border-gold/20 p-5 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gold/10 text-gold flex items-center justify-center">{icon}</div>
      <p className="font-serif text-lg mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

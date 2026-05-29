import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — Crème de la Crème Nails ®" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        // Notify admin (best-effort, never block)
        fetch("/api/public/notify-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, userId: data.user?.id ?? null }),
        }).catch((err) => console.error("Signup notification failed", err));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/admin" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-10">
          <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
          <p className="tracking-luxe text-[0.65rem] text-gold">CRÈME DE LA CRÈME · ADMIN</p>
        </Link>

        <div className="bg-cream border border-gold/20 p-8 md:p-10">
          <h1 className="font-serif text-3xl mb-2 text-center">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {mode === "signin" ? "Access your inbox of submissions." : "Set up your admin login."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm"
              />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground tracking-[0.22em] text-xs uppercase hover:bg-foreground transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</> : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="w-full text-center mt-6 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-gold transition"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          The first account you create needs to be granted admin access.
        </p>
      </div>
    </div>
  );
}

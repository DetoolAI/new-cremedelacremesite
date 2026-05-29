import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

type State = "checking" | "blocked" | "allowed";

/**
 * Site-wide "Under Construction" gate.
 * - Logged-in admins (user_roles.role = 'admin') bypass and see the real site.
 * - Everyone else sees a maintenance screen.
 * - The /admin and /auth routes are excluded at the mount site (see __root.tsx).
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setState("blocked");
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setState(role ? "allowed" : "blocked");
    };

    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-background" />
    );
  }

  if (state === "allowed") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="max-w-lg w-full text-center">
        <img src={logo} alt="Crème de la Crème Nails" className="mx-auto h-20 w-auto mb-8 opacity-90" />
        <div className="inline-block px-3 py-1 rounded-full border border-border text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Under Construction
        </div>
        <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
          We&apos;re polishing things up
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Our website is temporarily offline while we make some updates.
          Please check back shortly — we can&apos;t wait to welcome you.
        </p>
        <div className="text-sm text-muted-foreground space-y-1 mb-10">
          <p>For appointments or questions, please contact us directly:</p>
          <p className="text-foreground font-medium">angie@cremedelacremenails.com</p>
        </div>
        <Link
          to="/auth"
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-4"
        >
          Staff login
        </Link>
      </div>
    </div>
  );
}

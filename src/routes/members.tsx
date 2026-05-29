import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Members — Crème de la Crème Nails ®" },
      { name: "description", content: "Sign in to your Crème Society membership." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MembersEntry,
});

function MembersEntry() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate({ to: "/member-book", replace: true });
      else navigate({ to: "/member-login", search: { redirect: "/member-book" } as never, replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

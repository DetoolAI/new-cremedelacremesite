import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Section = Record<string, any>;
type PageContent = Record<string, Section>;

const cache = new Map<string, PageContent>();
const listeners = new Map<string, Set<(c: PageContent) => void>>();

async function fetchPage(slug: string): Promise<PageContent> {
  const { data } = await supabase
    .from("page_content")
    .select("section_key, value, visible")
    .eq("page_slug", slug)
    .eq("visible", true);
  const out: PageContent = {};
  for (const row of data ?? []) {
    out[(row as any).section_key] = ((row as any).value ?? {}) as Section;
  }
  cache.set(slug, out);
  return out;
}

/**
 * Returns merged page content with safe fallbacks.
 * `fallback` provides default values used until DB content arrives,
 * and as a per-field backstop if any key is missing.
 */
export function usePageContent<T extends PageContent>(slug: string, fallback: T): T {
  const [content, setContent] = useState<T>(() => mergeDeep(fallback, cache.get(slug) ?? {}) as T);

  useEffect(() => {
    let alive = true;
    fetchPage(slug).then((c) => {
      if (!alive) return;
      setContent(mergeDeep(fallback, c) as T);
      const subs = listeners.get(slug);
      subs?.forEach((cb) => cb(c));
    });

    if (!listeners.has(slug)) listeners.set(slug, new Set());
    const cb = (c: PageContent) => alive && setContent(mergeDeep(fallback, c) as T);
    listeners.get(slug)!.add(cb);

    // Realtime: refresh on any change to this page
    const channel = supabase
      .channel(`page_content_${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "page_content", filter: `page_slug=eq.${slug}` },
        () => fetchPage(slug).then((c) => alive && setContent(mergeDeep(fallback, c) as T)),
      )
      .subscribe();

    return () => {
      alive = false;
      listeners.get(slug)?.delete(cb);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return content;
}

function mergeDeep(a: any, b: any): any {
  if (b === undefined || b === null) return a;
  if (Array.isArray(b)) return b.length ? b : a;
  if (typeof b !== "object" || typeof a !== "object" || a === null) return b;
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = mergeDeep(a?.[k], b[k]);
  }
  return out;
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";

const fallback = {
  hero: {
    eyebrow: "GROUPS · PARTIES · BRIDAL",
    heading_part1: "Celebrate with",
    heading_part2: "us.",
    description: "Birthdays, bridal parties, bachelorettes, corporate events — in-salon or mobile on-location. Tell us a few details and Angie will personally follow up to plan it with you.",
  },
  form: {
    eyebrow: "INQUIRY FORM",
    heading: "Tell us about your event",
    submit_label: "Send Inquiry",
    success_heading: "Thank you!",
  },
};

export const Route = createFileRoute("/parties")({
  head: () => ({
    meta: [
      { title: "Parties, Birthdays & Bridal Inquiries — Crème de la Crème Nails ®" },
      { name: "description", content: "Book group nail services for birthdays, bridal parties, bachelorettes and corporate events. In-salon or mobile on-location. Send us your inquiry." },
      { property: "og:title", content: "Parties & Bridal — Crème de la Crème Nails ®" },
      { property: "og:description", content: "Group nail services for birthdays, bridal parties, bachelorettes & corporate events." },
    ],
  }),
  component: PartiesPage,
});

type EventType = "birthday" | "bridal" | "bachelorette" | "corporate" | "private_party" | "other";
type Location = "in_salon" | "mobile_on_location";

function PartiesPage() {
  const c = usePageContent("parties", fallback);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState<EventType>("birthday");
  const [location, setLocation] = useState<Location>("in_salon");
  const [groupSize, setGroupSize] = useState("");
  const [services, setServices] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const valid =
    name.trim() &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 5 &&
    groupSize.trim() &&
    services.trim() &&
    dateRange.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/party-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          event_type: eventType,
          location,
          group_size: groupSize.trim(),
          services: services.trim(),
          date_range: dateRange.trim(),
          message: message.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not submit inquiry");
      setSubmitted(true);
      toast.success("Inquiry sent — Angie will be in touch soon!");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="pt-32 md:pt-40 pb-10 px-5 sm:px-6 text-center max-w-3xl mx-auto">
        <p className="font-display tracking-luxe text-[0.75rem] text-gold mb-4">{c.hero.eyebrow}</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] mb-5 uppercase">
          {c.hero.heading_part1} <span className="font-script italic font-light text-gold normal-case">{c.hero.heading_part2}</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          {c.hero.description}
        </p>
      </section>

      <section className="px-5 sm:px-6 lg:px-10 pb-24">
        <div className="max-w-3xl mx-auto bg-cream border border-gold/30 rounded-2xl p-5 sm:p-8 md:p-12 shadow-soft">
          {submitted ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-gold mx-auto mb-4" />
              <p className="font-script italic text-3xl text-gold mb-3">{c.form.success_heading}</p>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your inquiry has been sent to <strong>angie@cremedelacremenails.com</strong>. A confirmation
                was also emailed to <strong>{email}</strong>. We'll be in touch shortly to plan your event.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="font-display tracking-luxe text-[0.75rem] text-gold text-center mb-2">{c.form.eyebrow}</p>
              <h2 className="font-serif text-2xl md:text-3xl text-center mb-6 uppercase">{c.form.heading}</h2>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Your name" value={name} onChange={setName} />
                <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
              </div>
              <Field label="Email" type="email" value={email} onChange={setEmail} />

              <div className="grid sm:grid-cols-2 gap-5">
                <Select label="Event type" value={eventType} onChange={(v) => setEventType(v as EventType)} options={[
                  ["birthday", "Birthday Party"],
                  ["bridal", "Bridal Party"],
                  ["bachelorette", "Bachelorette"],
                  ["corporate", "Corporate / Group Event"],
                  ["private_party", "Private Party"],
                  ["other", "Other"],
                ]} />
                <Select label="Location" value={location} onChange={(v) => setLocation(v as Location)} options={[
                  ["in_salon", "In Salon (4413 Broadway)"],
                  ["mobile_on_location", "Mobile / On-Location"],
                ]} />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Group size" value={groupSize} onChange={setGroupSize} placeholder="e.g. 6 people" />
                <Field label="Preferred date(s)" value={dateRange} onChange={setDateRange} placeholder="e.g. Sat, June 14 (or weekend of)" />
              </div>

              <Textarea
                label="Services requested"
                value={services}
                onChange={setServices}
                placeholder="e.g. Gel manicures + regular pedicures for everyone, plus nail art for the bride"
                rows={3}
              />

              <Textarea
                label="Additional notes (optional)"
                value={message}
                onChange={setMessage}
                placeholder="Anything else we should know — theme, dietary needs, on-site address, etc."
                rows={3}
                required={false}
              />

              <button
                type="submit"
                disabled={!valid || submitting}
                className="font-display w-full py-4 bg-primary text-primary-foreground tracking-[0.28em] text-xs uppercase hover:bg-foreground transition rounded-full disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Sending…" : c.form.submit_label}
              </button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Inquiries go directly to angie@cremedelacremenails.com
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
      <StickyBook />
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required = true,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block font-display text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm rounded-md"
      />
    </div>
  );
}

function Textarea({
  label, value, onChange, placeholder, rows = 3, required = true,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean }) {
  return (
    <div>
      <label className="block font-display text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm rounded-md resize-y"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="block font-display text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm rounded-md"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

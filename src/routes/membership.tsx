import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { StickyBook } from "@/components/StickyBook";
import { SquareCardForm } from "@/components/SquareCardForm";
import { SignaturePad } from "@/components/SignaturePad";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import polish from "@/assets/membership.jpg";
import salonBg from "@/assets/membership-bg.jpg";
import { usePageContent } from "@/hooks/usePageContent";

const membershipFallback = {
  hero: {
    eyebrow: "MONTHLY MEMBERSHIPS",
    heading_part1: "The Nails",
    heading_part2: "Club.",
    description:
      "A monthly recurring manicure & pedicure subscription — for those who consider beautifully groomed nails a non-negotiable.",
  },
  add_ons_section: {
    eyebrow: "MEMBERSHIP EXTRAS",
    heading: "Add-ons & Upgrades",
    description: "Per visit, if requested. Available to all members on top of any membership tier.",
  },
  enroll_section: {
    eyebrow: "JOIN TODAY",
    heading: "Membership Enrollment",
    description:
      "Securely save your card with Square. Your membership renews automatically each month.",
  },
};

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — Crème de la Crème Nails ®" },
      {
        name: "description",
        content:
          "Join the Nails Club. Sign up for our monthly membership for priority booking and exclusive offers.",
      },
      { property: "og:title", content: "Monthly Memberships — Crème de la Crème Nails ®" },
      {
        property: "og:description",
        content: "The luxury nail subscription. Skip the queue. Look polished, every month.",
      },
    ],
  }),
  component: MembershipPage,
});

type Tier = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  originalPrice: number;
  savings: number;
  benefits: string[];
  featured?: boolean;
  popular?: boolean;
};

const tiers: Tier[] = [
  // 1
  {
    name: "Regular Pedi Only",
    tagline: "Happy feet, every month",
    monthlyPrice: 66,
    originalPrice: 72.8,
    savings: 9.8,
    benefits: ["2× Regular Pedicures"],
  },
  // 2
  {
    name: "Basic — Mani & Pedi",
    tagline: "The classic ritual",
    popular: true,
    monthlyPrice: 93,
    originalPrice: 118.4,
    savings: 23.4,
    benefits: ["2× Traditional Manicures", "2× Regular Pedicures"],
  },
  // 3
  {
    name: "Builder Gel + Gel Pedi",
    tagline: "Long-wearing strength",
    featured: true,
    popular: true,
    monthlyPrice: 113,
    originalPrice: 122.72,
    savings: 11.72,
    benefits: ["1× Builder Gel Overlay", "1× Gel Pedi + Gel Soak Off"],
  },
  // 4
  {
    name: "Gel Mani & Gel Pedi",
    tagline: "Always polished",
    popular: true,
    monthlyPrice: 120,
    originalPrice: 135.12,
    savings: 15.12,
    benefits: ["2× Gel Manicures + 2 Gel Soaks", "1× Gel Pedicure + Gel Soak"],
  },
  // 5
  {
    name: "2× Builder Gel + Gel Pedi",
    tagline: "Double the strength",
    monthlyPrice: 180,
    originalPrice: 195.52,
    savings: 19.52,
    benefits: ["2× Builder Gel Overlay", "1× Gel Pedi + Gel Soak"],
  },
  // 6 (was 5a)
  {
    name: "2× Builder Gel + 2× Regular Pedi",
    tagline: "Strength meets simple",
    monthlyPrice: 200,
    originalPrice: 218.4,
    savings: 22.4,
    benefits: ["2× Builder Gel Overlay", "2× Regular Pedicure"],
  },
  // 7
  {
    name: "Russian Gel Mani & Pedi",
    tagline: "The Russian signature",
    monthlyPrice: 120,
    originalPrice: 135.2,
    savings: 17.2,
    benefits: ["1× Russian Gel Manicure", "1× Russian Gel Pedicure"],
  },
  // 8
  {
    name: "Acrylic Refill + Gel Pedi",
    tagline: "Sculpted & smooth",
    popular: true,
    monthlyPrice: 162,
    originalPrice: 174.72,
    savings: 16.72,
    benefits: ["2× Acrylic Cover Refill", "1× Gel Pedicure + Gel Soak Off"],
  },
  // 9
  {
    name: "Gel Mani + Regular Pedi",
    tagline: "Effortless polish",
    popular: true,
    monthlyPrice: 145,
    originalPrice: 156.0,
    savings: 15.0,
    benefits: ["2× Gel Manicure + Gel Soak", "2× Regular Pedicure"],
  },
  // 10
  {
    name: "Russian Gel-X Extensions + Gel Pedi",
    tagline: "Length, perfected",
    monthlyPrice: 160,
    originalPrice: 176.8,
    savings: 18.8,
    benefits: ["1× Russian Gel-X Extensions", "1× Russian Gel Pedicure"],
  },
  // 11
  {
    name: "Protein Gel Mani & Spa Gel Pedi",
    tagline: "Strength & spa",
    monthlyPrice: 165,
    originalPrice: 186.16,
    savings: 25.16,
    benefits: ["2× Protein Gel Mani + Soak Off", "1× Spa Premium Gel Pedi + Soak Off"],
  },
  // 12
  {
    name: "Acrylic Cover Backfill S–M",
    tagline: "Maintained & flawless",
    monthlyPrice: 120,
    originalPrice: 135.2,
    savings: 19.2,
    benefits: ["2× Acrylic Cover Refill"],
  },
  // 13
  {
    name: "Russian Hardgel Overlay + Russian Gel Pedi",
    tagline: "Elevated essentials",
    monthlyPrice: 165,
    originalPrice: 185.04,
    savings: 20.04,
    benefits: ["1× Russian Hardgel Overlay", "1× Russian Gel Pedicure"],
  },
  // 14
  {
    name: "Russian Acrylic Refill + Regular Pedi",
    tagline: "Refined sculpt",
    monthlyPrice: 190,
    originalPrice: 202.8,
    savings: 16.8,
    benefits: ["2× Russian Acrylic Refill", "1× Regular Pedicure"],
  },
  // 15
  {
    name: "Russian Mani + Gel Pedi",
    tagline: "The detailed Russian",
    popular: true,
    monthlyPrice: 160,
    originalPrice: 174.72,
    savings: 18.72,
    benefits: ["2× Russian Manicure", "1× Gel Pedicure"],
  },
  // 16
  {
    name: "Premium Spa Gel Pedicure + Soak Off",
    tagline: "Pure pedi indulgence",
    monthlyPrice: 78,
    originalPrice: 86.32,
    savings: 8.32,
    benefits: ["1× Premium Spa Gel Pedi + Soak Off"],
  },
  // 17
  {
    name: "Premium Spa Pedi + Mani Gel",
    tagline: "Spa from head to toe",
    popular: true,
    monthlyPrice: 160,
    originalPrice: 169.52,
    savings: 13.52,
    benefits: ["1× Premium Spa Gel Pedi + Soak Off", "2× Gel Manicure + Soak Off"],
  },
  // 18
  {
    name: "Premium Gel Mani & Pedi",
    tagline: "The full luxury",
    popular: true,
    monthlyPrice: 190,
    originalPrice: 211.12,
    savings: 25.12,
    benefits: ["2× Russian Manicure", "1× Premium Spa Gel Pedi"],
  },
  // 19
  {
    name: "Gel Mani + Regular Pedi (Lite)",
    tagline: "Lighter routine",
    monthlyPrice: 110,
    originalPrice: 119.6,
    savings: 13.6,
    benefits: ["2× Gel Manicure + Gel Soak", "1× Regular Pedicure"],
  },
  // 20
  {
    name: "Buff Manicure Only",
    tagline: "The bare essential",
    monthlyPrice: 45,
    originalPrice: 54.08,
    savings: 13.08,
    benefits: ["2× Buff Manicure"],
  },
  // 21
  {
    name: "Russian Buff Manicures",
    tagline: "Russian, refined",
    monthlyPrice: 65,
    originalPrice: 72.8,
    savings: 11.8,
    benefits: ["2× Russian Buff Manicure"],
  },
  // 22
  {
    name: "Buff Mani & Pedi",
    tagline: "Clean, polished, easy",
    monthlyPrice: 85,
    originalPrice: 96.72,
    savings: 15.72,
    benefits: ["2× Buff Manicure", "1× Buff Pedicure"],
  },
  // 23
  {
    name: "2× Long Acrylic Refill + Regular Pedi",
    tagline: "Long-wear sculpt",
    monthlyPrice: 162,
    originalPrice: 182,
    savings: 20,
    benefits: ["2× Long Acrylic Refill", "1× Regular Pedicure"],
  },
];

const addOns: { name: string; price: string }[] = [
  { name: "Shiny Buff", price: "+$6" },
  { name: "Full Set Extensions", price: "+$10–20" },
  { name: "10-min Massage", price: "$15" },
  { name: "Nail Art (hand-painted, gems, 3D, French, Cateye, Chrome…)", price: "$15–60" },
  { name: "Callus Remover", price: "$11–20" },
  { name: "Russian Clean-up", price: "+$20" },
  { name: "Hard Gel / Acrylic / Soft Gel Soak Off", price: "+$11–20" },
  { name: "2 Big-toe Acrylic Overlay", price: "+$16" },
  { name: "Spa Premium Pedi Upgrade", price: "+$35" },
  { name: "Soak Off + Full Set", price: "+$26–31" },
];

function MembershipPage() {
  const mc = usePageContent("membership", membershipFallback);
  const featuredTier = tiers.find((t) => t.featured) ?? tiers[0];
  const [selectedTier, setSelectedTier] = useState<string>(featuredTier.name);
  const [submitted, setSubmitted] = useState(false);
  const [membershipCardUrl, setMembershipCardUrl] = useState<string | null>(null);
  const [showCardStep, setShowCardStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postal, setPostal] = useState("");
  const [initials, setInitials] = useState("");
  const [signature, setSignature] = useState("");

  const tier = tiers.find((t) => t.name === selectedTier) ?? featuredTier;

  const missingFields: string[] = [];
  if (!firstName.trim()) missingFields.push("First name");
  if (!lastName.trim()) missingFields.push("Last name");
  if (!/\S+@\S+\.\S+/.test(email)) missingFields.push("Valid email");
  if (phone.trim().length < 5) missingFields.push("Phone");
  if (!address1.trim()) missingFields.push("Billing address");
  if (!city.trim()) missingFields.push("City");
  if (state.trim().length < 2) missingFields.push("State");
  if (postal.trim().length < 3) missingFields.push("ZIP");
  if (initials.trim().length < 1) missingFields.push("Initials");
  if (signature.length === 0) missingFields.push("Signature");
  if (!agreed) missingFields.push("Agreement checkbox");
  const formValid = missingFields.length === 0;

  const handleEnroll = async (sourceId: string, idempotencyKey: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/enroll-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: idempotencyKey,
          enrollment: {
            customer_first_name: firstName.trim(),
            customer_last_name: lastName.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            billing_address_line1: address1.trim(),
            billing_address_line2: address2.trim() || null,
            billing_city: city.trim(),
            billing_state: state.trim(),
            billing_postal_code: postal.trim(),
            billing_country: "US",
            tier_name: selectedTier,
            customer_initials: initials.trim().toUpperCase(),
            signature_data_url: signature,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Enrollment failed");
      if (json?.membership_card_url) setMembershipCardUrl(json.membership_card_url);
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not complete enrollment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-background">
      <div
        aria-hidden
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${salonBg})`, opacity: 0.45 }}
      />
      {/* Cream wash for readability */}
      <div aria-hidden className="fixed inset-0 bg-background/55 pointer-events-none" />
      <div className="relative">
        <Nav />
        <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-5 sm:px-6 text-center">
          <p className="font-display tracking-luxe text-[0.75rem] text-gold mb-5">
            {mc.hero.eyebrow}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-6 uppercase">
            {mc.hero.heading_part1}{" "}
            <span className="font-script italic font-light text-gold normal-case">
              {mc.hero.heading_part2}
            </span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{mc.hero.description}</p>
        </section>

        <section className="px-5 sm:px-6 lg:px-10 pb-12">
          <div className="max-w-3xl mx-auto rounded-2xl border border-gold/40 bg-card/70 backdrop-blur p-6 sm:p-8 shadow-luxe">
            <p className="font-display tracking-luxe text-[0.7rem] text-gold mb-3 text-center uppercase">
              Monthly Crème Nail Membership Perks
            </p>
            <ul className="space-y-2 text-sm text-foreground/90 list-disc pl-5 marker:text-gold">
              <li>Recurring appointments pre-set option</li>
              <li>Discounted specials for nail club members</li>
              <li>No appointment deposit necessary</li>
              <li>Coupons and loyalty points can be used for additional add-ons</li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-4 text-center">
              Month-to-month membership · No commitment · Non-transferable · Does not carry over.
            </p>
          </div>
        </section>

        <section className="px-5 sm:px-6 lg:px-10 pb-16">
          <div className="max-w-md mx-auto">
            <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden shadow-luxe bg-foreground/5">
              <iframe
                src="https://www.youtube.com/embed/LH_x9LdpVZI?cc_load_policy=1&cc_lang_pref=en&playsinline=1&rel=0&modestbranding=1"
                title="Nail Memberships"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3 italic">
              Tap to play with sound · Tap CC for subtitles
            </p>
          </div>
        </section>

        <section className="px-5 sm:px-6 lg:px-10 pb-16">
          <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tiers.map((t, i) => (
              <div
                key={t.name}
                className={`relative p-8 border rounded-2xl flex flex-col ${
                  t.popular
                    ? "border-destructive bg-destructive text-destructive-foreground shadow-luxe"
                    : t.featured
                      ? "border-gold bg-primary text-primary-foreground shadow-luxe scale-[1.02]"
                      : "border-border bg-background"
                }`}
              >
                <span
                  className={`absolute top-4 right-4 font-display text-xs tracking-luxe rounded-full h-8 w-8 flex items-center justify-center border ${t.popular ? "border-white/70 text-white" : "border-gold/50 text-gold"}`}
                >
                  {i + 1}
                </span>
                {t.popular && (
                  <p className="font-display tracking-luxe text-[0.65rem] text-white/90 mb-3">
                    POPULAR
                  </p>
                )}
                {!t.popular && t.featured && (
                  <p className="font-display tracking-luxe text-[0.65rem] text-gold mb-3">
                    MOST LOVED
                  </p>
                )}
                <h3 className="font-display text-2xl uppercase tracking-wider mb-2 pr-10">
                  {t.name}
                </h3>
                <p
                  className={`font-script italic text-lg mb-2 ${
                    t.popular
                      ? "text-white/85"
                      : t.featured
                        ? "text-background/80"
                        : "text-muted-foreground"
                  }`}
                >
                  {t.tagline}
                </p>
                <p
                  className={`font-display text-3xl ${t.popular ? "text-white" : t.featured ? "text-gold" : "text-foreground"}`}
                >
                  ${t.monthlyPrice}
                  <span className="text-xs font-normal opacity-70">/mo</span>
                </p>
                <p
                  className={`text-xs mb-1 ${t.popular ? "text-white/75" : t.featured ? "text-background/60" : "text-muted-foreground"}`}
                >
                  <span className="line-through">${t.originalPrice.toFixed(2)}</span>{" "}
                  <span
                    className={t.popular ? "text-white font-semibold" : "text-gold font-semibold"}
                  >
                    save ${t.savings.toFixed(2)}
                  </span>
                </p>
                <p
                  className={`text-[0.65rem] uppercase tracking-luxe mb-6 ${t.popular ? "text-white/60" : t.featured ? "text-background/50" : "text-muted-foreground/70"}`}
                >
                  Taxes & fees included
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {t.benefits.map((b) => (
                    <li key={b} className="flex gap-3 text-sm">
                      <span className={t.popular ? "text-white" : "text-gold"}>✦</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <a
                  href="#enroll"
                  onClick={() => {
                    setSelectedTier(t.name);
                    setShowCardStep(false);
                  }}
                  className={`font-display block text-center py-3 tracking-[0.22em] text-xs uppercase transition rounded-full ${
                    t.popular
                      ? "bg-white text-destructive hover:bg-white/90"
                      : t.featured
                        ? "bg-gold text-background hover:bg-foreground"
                        : "bg-primary text-primary-foreground hover:bg-foreground"
                  }`}
                >
                  Choose {t.name}
                </a>
              </div>
            ))}
          </div>
          <p className="max-w-3xl mx-auto text-xs text-muted-foreground text-center mt-10 leading-relaxed">
            <strong className="text-foreground">Add-ons charged separately:</strong> see the full
            list below.
            <br />
            This is a discounted membership price and cannot be combined with other offers.
          </p>
        </section>

        {/* ADD-ONS / EXTRAS */}
        <section className="px-5 sm:px-6 lg:px-10 pb-16">
          <div className="max-w-4xl mx-auto bg-cream/80 border border-gold/30 rounded-2xl p-6 sm:p-10 shadow-soft">
            <p className="font-display tracking-luxe text-[0.75rem] text-gold mb-2 text-center">
              {mc.add_ons_section.eyebrow}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-center mb-3 uppercase">
              {mc.add_ons_section.heading}
            </h2>
            <p className="text-muted-foreground text-center text-sm max-w-xl mx-auto mb-8">
              {mc.add_ons_section.description}
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {addOns.map((a) => (
                <li
                  key={a.name}
                  className="flex items-baseline justify-between gap-4 border-b border-gold/15 pb-2"
                >
                  <span className="text-sm text-foreground">{a.name}</span>
                  <span className="font-display text-sm text-gold whitespace-nowrap">
                    {a.price}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ENROLLMENT FORM */}
        <section id="enroll" className="px-5 sm:px-6 lg:px-10 pb-24 scroll-mt-24">
          <div className="max-w-3xl mx-auto bg-cream border border-gold/30 rounded-2xl p-5 sm:p-8 md:p-12 shadow-soft">
            <p className="font-display tracking-luxe text-[0.75rem] text-gold mb-3 text-center">
              {mc.enroll_section.eyebrow}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-center mb-3 uppercase">
              {mc.enroll_section.heading}
            </h2>
            <p className="text-muted-foreground text-center mb-8 text-sm">
              {mc.enroll_section.description}
            </p>

            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <p className="font-script italic text-3xl text-gold">Welcome to the Club.</p>
                <p className="text-muted-foreground">
                  A confirmation has been sent to <strong>{email}</strong>. Your{" "}
                  <strong>{selectedTier}</strong> membership is set up and your card is securely
                  saved with Square — we'll handle billing each month and email you a receipt
                  automatically.
                </p>
                {membershipCardUrl && (
                  <div className="pt-4">
                    <a
                      href={membershipCardUrl}
                      className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-md font-display tracking-luxe text-xs uppercase hover:opacity-90"
                    >
                      Open My Membership Card →
                    </a>
                    <p className="text-xs text-muted-foreground mt-3">
                      Save this page to your phone. Show the QR code at the front desk for check-in.
                    </p>
                  </div>
                )}
              </div>
            ) : !showCardStep ? (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="First name" value={firstName} onChange={setFirstName} />
                  <Field label="Last name" value={lastName} onChange={setLastName} />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Email" type="email" value={email} onChange={setEmail} />
                  <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
                </div>
                <Field label="Billing Address" value={address1} onChange={setAddress1} />
                <Field
                  label="Apt / Suite (optional)"
                  value={address2}
                  onChange={setAddress2}
                  required={false}
                />
                <div className="grid sm:grid-cols-3 gap-5">
                  <Field label="City" value={city} onChange={setCity} />
                  <Field label="State" value={state} onChange={setState} placeholder="NY" />
                  <Field label="ZIP" value={postal} onChange={setPostal} />
                </div>
                <div>
                  <label className="block font-display text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">
                    Membership tier
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border focus:border-gold outline-none text-sm rounded-md"
                  >
                    {tiers.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} — ${t.monthlyPrice}/mo · {t.tagline}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="border-t border-gold/20 pt-5 space-y-5">
                  <div>
                    <p className="font-display tracking-luxe text-[0.7rem] text-gold mb-1">
                      SIGNATURE REQUIRED
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Please add your initials and signature to authorize this membership
                      enrollment.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-[160px_1fr] gap-5 items-start">
                    <Field
                      label="Initials"
                      value={initials}
                      onChange={(v) => setInitials(v.slice(0, 5).toUpperCase())}
                      placeholder="A.B."
                    />
                    <div>
                      <label className="block font-display text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">
                        Signature
                      </label>
                      <SignaturePad value={signature} onChange={setSignature} />
                    </div>
                  </div>
                </div>
                <div className="bg-background/50 border border-border rounded-md p-4">
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-gold cursor-pointer"
                    />
                    <span className="text-muted-foreground leading-relaxed">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowAgreement(true)}
                        className="text-gold underline hover:text-foreground"
                      >
                        Membership Agreement
                      </button>
                      , including automatic monthly renewal, the 7-day cancellation notice, and
                      authorize Crème de la Crème Nails to charge my card monthly for the membership
                      fee.
                    </span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!formValid) {
                      toast.error(`Please complete: ${missingFields.join(", ")}`);
                      return;
                    }
                    setShowCardStep(true);
                  }}
                  className="font-display w-full py-4 bg-primary text-primary-foreground tracking-[0.28em] text-xs uppercase hover:bg-foreground transition rounded-full"
                >
                  Continue to Payment
                </button>
                {!formValid && (
                  <p className="text-xs text-center text-muted-foreground">
                    Still needed: {missingFields.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowCardStep(false)}
                  disabled={submitting}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  ← Edit details
                </button>
                <SquareCardForm
                  amountLabel={`$${tier.monthlyPrice}.00/mo`}
                  amountCents={tier.monthlyPrice * 100}
                  recurring
                  submitting={submitting}
                  buyer={{
                    firstName,
                    lastName,
                    email,
                    phone,
                    address1,
                    address2,
                    city,
                    state,
                    postalCode: postal,
                    countryCode: "US",
                  }}
                  onPaid={handleEnroll}
                  buttonLabel={
                    submitting ? "Enrolling…" : `Enroll in ${tier.name} — $${tier.monthlyPrice}/mo`
                  }
                  summary={
                    <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Membership</span>
                        <span className="font-semibold">{tier.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Recurring</span>
                        <span className="font-semibold text-base">
                          ${tier.monthlyPrice}.00 / month
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                        Your card is saved securely with Square. The first charge happens today and
                        again on the same day each month. Cancel anytime by emailing or calling us.
                      </p>
                    </div>
                  }
                />
                {submitting && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Setting up your membership…
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="relative h-[50vh] overflow-hidden">
          <img src={polish} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center text-center text-background px-6">
            <p className="font-script italic text-3xl md:text-5xl max-w-2xl">
              "Life isn't perfect, but your nails can be!"
            </p>
          </div>
        </section>

        <Footer />
        <StickyBook />
        {showAgreement && (
          <div
            className="fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAgreement(false)}
          >
            <div
              className="bg-background max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-2xl shadow-luxe border border-gold/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                <h3 className="font-serif text-xl uppercase">Membership Agreement</h3>
                <button
                  type="button"
                  onClick={() => setShowAgreement(false)}
                  className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="px-6 py-6 text-sm space-y-4 text-foreground/90 leading-relaxed">
                <p className="text-xs uppercase tracking-luxe text-muted-foreground">
                  State of New York
                </p>
                <p>
                  <strong>Crème de la Crème Nails</strong>
                  <br />
                  4413 Broadway NYC (189th St)
                  <br />
                  347.880.8282 · angie@cremedelacremenails.com
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">1. Purpose</h4>
                <p>
                  This Agreement outlines the terms under which the Salon provides recurring nail
                  care services to the Member in exchange for a monthly membership fee.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  2. Membership
                </h4>
                <p>
                  The Salon offers monthly membership plans (e.g., Russian Gel Mani &amp; Pedi,
                  Basic Mani &amp; Pedi, Builder &amp; Gel Pedi, Gel Mani &amp; Pedi, Protein Gel
                  Mani &amp; Premium Spa Gel Pedi, Regular Pedi Only, Acrylic Refill + Gel Pedi, Gel
                  Mani + Regular Pedi, Russian Gel-X Extensions + Gel Pedi, and others). Any
                  services not included in the selected plan will be charged at the Salon's standard
                  rates.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  3. Payment Authorization
                </h4>
                <p>
                  Member authorizes the Salon to charge the monthly membership fee to the payment
                  method on file. Payments are charged automatically each month on the same day as
                  the initial signup date.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  4. Term and Renewal
                </h4>
                <p>
                  This Agreement begins on the Effective Date and continues{" "}
                  <strong>month-to-month</strong> until terminated. Membership{" "}
                  <strong>automatically renews each month</strong> unless cancelled in writing at
                  least <strong>seven (7) days</strong> before the next billing date.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  5. Scheduling and Appointments
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Services included must be scheduled in advance and are subject to availability.
                  </li>
                  <li>
                    No-shows or cancellations within 48 hours of an appointment may result in
                    forfeit of that month's service.
                  </li>
                  <li>
                    Unused services <strong>do not roll over</strong> unless otherwise stated in
                    writing.
                  </li>
                </ul>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  6. Member Benefits
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Priority scheduling during peak hours.</li>
                  <li>Discounts on retail products or additional services (where offered).</li>
                  <li>Access to special member-only events or promotions.</li>
                </ul>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  7. Late or Declined Payments
                </h4>
                <p>
                  If a payment is declined, Member has <strong>five (5) business days</strong> to
                  update payment information. If payment is not received within ten (10) business
                  days, the Salon may suspend or terminate the membership.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  8. Cancellation and Termination
                </h4>
                <p>
                  <strong>By Member:</strong> cancel by written notice (email or signed form) at
                  least 7 days before the next billing cycle. No refunds or prorations for partial
                  months.
                </p>
                <p>
                  <strong>By Salon:</strong> may terminate for cause (nonpayment, inappropriate
                  behavior, repeated missed appointments) or discontinue the program entirely with{" "}
                  <strong>30 days' written notice</strong>.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">9. Refunds</h4>
                <p>
                  Membership fees are non-refundable except where required by{" "}
                  <strong>New York General Business Law § 628-a</strong>. If cancellation occurs
                  within three (3) business days of purchase, Member is entitled to a full refund.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  10. Changes to Terms
                </h4>
                <p>
                  The Salon reserves the right to modify pricing, included services, or terms with
                  at least <strong>30 days' written notice</strong>. Continued participation after
                  notice constitutes acceptance.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  11. Liability Waiver
                </h4>
                <p>
                  Member agrees that the Salon and its employees are not responsible for any
                  injuries, allergic reactions, or damages resulting from nail services, except in
                  cases of proven negligence under New York law.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  12. Governing Law
                </h4>
                <p>
                  This Agreement is governed by the laws of the <strong>State of New York</strong>.
                  Disputes shall be resolved in the appropriate court in{" "}
                  <strong>New York County, NY</strong>.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  13. Entire Agreement
                </h4>
                <p>
                  This document constitutes the entire agreement between Salon and Member and
                  supersedes all prior understandings.
                </p>

                <h4 className="font-display uppercase tracking-wider text-gold pt-2">
                  Acknowledgment
                </h4>
                <p>
                  By checking the agreement box and enrolling, I acknowledge the terms of the
                  membership selected, the automatic renewal, and the cancellation policy, and I
                  authorize the Salon to charge my card monthly for the membership fee.
                </p>
              </div>
              <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAgreement(false)}
                  className="font-display px-6 py-2 text-xs tracking-[0.22em] uppercase border border-border rounded-full hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgreed(true);
                    setShowAgreement(false);
                  }}
                  className="font-display px-6 py-2 text-xs tracking-[0.22em] uppercase bg-gold text-background rounded-full hover:bg-foreground"
                >
                  I Agree
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block font-display text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">
        {label}
      </label>
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

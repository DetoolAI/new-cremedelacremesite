import { MessageCircle } from "lucide-react";

const PHONE = "13478808282"; // E.164 without +
const DEFAULT_MSG = encodeURIComponent(
  "Hi Crème de la Crème Nails ®! I have a question about booking an appointment."
);

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${PHONE}?text=${DEFAULT_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-24 right-5 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-luxe flex items-center justify-center hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-7 h-7" fill="currentColor" />
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}

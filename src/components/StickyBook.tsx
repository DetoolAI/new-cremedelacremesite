import { Calendar } from "lucide-react";
import { BOOKING_URL } from "@/lib/booking";

export function StickyBook() {
  return (
    <a
      href={BOOKING_URL}
      className="md:hidden fixed bottom-5 left-5 right-5 z-40 inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground tracking-[0.28em] text-xs uppercase shadow-luxe rounded-full font-display"
    >
      <Calendar className="w-4 h-4" />
      Book Appointment
    </a>
  );
}

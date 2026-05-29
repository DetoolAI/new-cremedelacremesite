import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { useBooking } from "./BookingProvider";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  serviceName?: string;
  categorySlug?: string;
}

export function BookingButton({ children, serviceName, categorySlug, ...rest }: Props) {
  const { open } = useBooking();
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (!e.defaultPrevented) open({ serviceName, categorySlug });
      }}
    >
      {children}
    </button>
  );
}

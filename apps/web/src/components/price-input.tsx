"use client";

import { useFormatter } from "next-intl";
import { formatPriceInput } from "@/lib/price-input";

/** Formats price text the way the current language groups numbers: "80000" becomes "80.000" in Spanish. */
export function useFormatPrice(): (typed: string) => string {
  const format = useFormatter();
  return (typed) => formatPriceInput(typed, (value) => format.number(value, { useGrouping: "always", maximumFractionDigits: 0 }));
}

interface Props {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

/** The price field: a dollar sign, a numeric keyboard, and the digits grouped as they are typed. */
export function PriceInput({ id, value, placeholder, onChange }: Props) {
  const formatPrice = useFormatPrice();

  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(formatPrice(event.target.value));
        }}
        className="h-14 w-full rounded-2xl border-2 border-field bg-card pl-9 pr-4 text-lg"
      />
    </div>
  );
}

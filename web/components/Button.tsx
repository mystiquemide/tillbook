import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "tint" | "dark" | "light" | "glass";
type Size = "lg" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-ink",
  tint: "bg-primary-tint text-primary-ink hover:bg-[rgba(110,84,255,0.16)]",
  dark: "bg-ink text-white hover:bg-[#3a3436]",
  light: "bg-white text-ink hover:bg-[#f1f0ee]",
  glass: "bg-white/10 text-white hover:bg-white/15",
};

const sizes: Record<Size, string> = {
  lg: "h-12 px-6 text-[17px]",
  sm: "h-8 px-4 text-[14px]",
};

export function ButtonLink({
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center justify-center rounded-full font-[450] transition-colors duration-150 ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}

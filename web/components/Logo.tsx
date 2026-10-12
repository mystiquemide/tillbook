export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-[19px] font-[550] tracking-[-0.03em] text-ink">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" rx="6" fill="var(--primary)" />
        <path d="M6 8h10M6 11.5h10M6 15h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      Tillbook
    </span>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 place-items-center rounded-2xl bg-primary text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="size-6" role="img" aria-label="Naadi Loop">
          <path
            d="M5 17h5l2.2-6 4.2 13 2.8-7H27"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
        <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-accent" />
      </div>
      <div>
        <p className="font-display text-lg font-bold leading-none text-primary-ink">Naadi Loop</p>
        <p className="mt-1 hidden text-[0.65rem] font-medium text-muted sm:block">
          Care that reaches completion
        </p>
      </div>
    </div>
  );
}

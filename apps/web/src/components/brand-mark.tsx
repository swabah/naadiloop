export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid size-10 place-items-center rounded-[0.9rem] bg-primary text-white shadow-[0_8px_20px_-10px_rgba(37,99,235,.9)]">
        <svg viewBox="0 0 32 32" className="size-5.5" role="img" aria-label="Naadi Loop">
          <path
            d="M5 17h5l2.2-6 4.2 13 2.8-7H27"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
        <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-success" />
      </div>
      <div>
        <p className="font-display text-lg font-extrabold leading-none tracking-tight text-primary-ink">
          Naadi
        </p>
        <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted">
          Care loop
        </p>
      </div>
    </div>
  );
}

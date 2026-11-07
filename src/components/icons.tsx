// Small inline icons. All are decorative: the text next to each one carries the meaning.

type IconProps = { size?: number; className?: string };

export function InfoIcon({ size = 16, className = "icon" }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7.25" y="6.75" width="1.5" height="5" rx="0.75" fill="currentColor" />
      <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className = "icon" }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20, className = "icon" }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10.5l2.5 2.5 4.5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QuoteGlyph() {
  return (
    <svg className="quote-glyph" width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" focusable="false">
      <path
        d="M0 12V7.2C0 3.4 1.9 1 5.6 0l.8 1.6C4.5 2.3 3.5 3.6 3.4 5.4H6.5V12H0zm9.5 0V7.2C9.5 3.4 11.4 1 15.1 0l.8 1.6c-1.9.7-2.9 2-3 3.8H16V12H9.5z"
        fill="currentColor"
      />
    </svg>
  );
}

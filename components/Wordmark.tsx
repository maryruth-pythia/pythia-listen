/**
 * Pythia wordmark — the overlapping-squares mark + the serif "Pythia".
 *
 * The brand mark is two overlapping rounded squares. On the cream/gradient
 * brand surfaces the squares are cream; here (on light app chrome) they render
 * in the brand purple + orange so the mark reads on white.
 */

interface WordmarkProps {
  /** Show the "Pythia" text next to the mark. Default true. */
  showText?: boolean;
  /** Pixel size of the square mark. Default 22. */
  size?: number;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Text color tone. Default 'plum'. */
  tone?: 'plum' | 'purple' | 'cream';
}

const TONE: Record<NonNullable<WordmarkProps['tone']>, string> = {
  plum: '#1F1330',
  purple: '#6A0FC2',
  cream: '#FCF6C4',
};

export default function Wordmark({
  showText = true,
  size = 22,
  className = '',
  tone = 'plum',
}: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="17" height="17" rx="3.5" fill="#6A0FC2" />
        <rect
          x="11"
          y="11"
          width="17"
          height="17"
          rx="3.5"
          fill="#FCC029"
          fillOpacity="0.9"
        />
      </svg>
      {showText && (
        <span
          className="font-serif text-lg font-semibold tracking-tight"
          style={{ color: TONE[tone] }}
        >
          Pythia
        </span>
      )}
    </span>
  );
}

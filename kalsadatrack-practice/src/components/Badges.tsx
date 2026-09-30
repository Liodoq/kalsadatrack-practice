import { STATUS_LABEL } from '../lib/format';
import type { ReportStatus } from '../lib/types';

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function VerifiedBadge() {
  return (
    <span className="badge badge-verified" title="Confirmed still unfinished by 3 people">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

export function RatingMeter({ value }: { value: number | null }) {
  const v = value ?? 0;
  return (
    <span className="meter" aria-label={value ? `Inconvenience ${value} of 5` : 'No ratings yet'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`meter-seg${v >= i - 0.25 ? ' on' : ''}`} />
      ))}
      <span className="meter-num">{value ? value.toFixed(1) : '—'}</span>
    </span>
  );
}

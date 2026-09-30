import { useEffect, useState } from 'react';
import { manilaMidnight } from '../lib/format';

const pad = (n: number) => String(n).padStart(2, '0');

/** Live counter of time since the roadwork was first noticed (Manila midnight). */
export default function DaysCounter({ since, size = 'lg' }: { since: string; size?: 'sm' | 'lg' }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = Math.max(0, now - manilaMidnight(since));
  const days = Math.floor(ms / 86_400_000);
  const rest = ms % 86_400_000;
  const h = Math.floor(rest / 3_600_000);
  const m = Math.floor((rest % 3_600_000) / 60_000);
  const s = Math.floor((rest % 60_000) / 1000);

  return (
    <div className={`counter counter-${size}`}>
      <span className="counter-days">{days.toLocaleString('en-PH')}</span>
      <span className="counter-meta">
        <span className="counter-unit">{days === 1 ? 'day' : 'days'} unfinished</span>
        <span className="counter-clock">
          +{pad(h)}:{pad(m)}:{pad(s)}
        </span>
      </span>
    </div>
  );
}

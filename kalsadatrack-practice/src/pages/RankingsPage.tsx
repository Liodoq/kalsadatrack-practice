import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CityRanking } from '../lib/types';
import { errorMessage } from '../lib/format';
import { RatingMeter } from '../components/Badges';
import PageState from '../components/PageState';

type SortKey = 'active' | 'inconvenience';

export default function RankingsPage() {
  const [rows, setRows] = useState<CityRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('active');

  useEffect(() => {
    supabase
      .from('city_rankings')
      .select('*')
      .then(({ data, error }) => {
        if (error) setError(errorMessage(error));
        else setRows(data as CityRanking[]);
        setLoading(false);
      });
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) =>
      sort === 'active'
        ? b.active_count - a.active_count || (b.avg_inconvenience ?? 0) - (a.avg_inconvenience ?? 0)
        : (b.avg_inconvenience ?? 0) - (a.avg_inconvenience ?? 0) || b.active_count - a.active_count,
    );
    return copy;
  }, [rows, sort]);

  const maxActive = Math.max(1, ...rows.map((r) => r.active_count));

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">City rankings</p>
        <h1>Which cities have the most unfinished roadworks?</h1>
        <p className="muted">Ranked by data only: active reports (not reported finished) and average commuter inconvenience.</p>
      </header>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={sort === 'active'} className={sort === 'active' ? 'on' : ''} onClick={() => setSort('active')}>
          Most active reports
        </button>
        <button
          role="tab"
          aria-selected={sort === 'inconvenience'}
          className={sort === 'inconvenience' ? 'on' : ''}
          onClick={() => setSort('inconvenience')}
        >
          Highest inconvenience
        </button>
      </div>

      {loading ? (
        <PageState kind="loading" />
      ) : error ? (
        <PageState kind="error" message={error} />
      ) : rows.length === 0 ? (
        <PageState kind="empty" message="No cities found. Run the city seed script." />
      ) : (
        <div className="card table-card">
          <table className="table rankings">
            <thead>
              <tr>
                <th>#</th>
                <th>City</th>
                <th>Active reports</th>
                <th className="hide-sm">Verified</th>
                <th>Avg. inconvenience</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id}>
                  <td className="rank">{String(i + 1).padStart(2, '0')}</td>
                  <td className="city">{r.name}</td>
                  <td>
                    <div className="bar-cell">
                      <span className="bar" style={{ width: `${(r.active_count / maxActive) * 100}%` }} />
                      <span className="bar-num">{r.active_count}</span>
                    </div>
                  </td>
                  <td className="hide-sm">{r.verified_count}</td>
                  <td>
                    <RatingMeter value={r.avg_inconvenience} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

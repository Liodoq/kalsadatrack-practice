import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHOTO_BUCKET, supabase } from '../lib/supabase';
import type { FlagReason, FlaggedReport, ReportStatus, ReportSummary } from '../lib/types';
import { FLAG_LABEL, STATUSES, STATUS_LABEL, errorMessage, formatDate } from '../lib/format';
import PageState from '../components/PageState';

type Tab = 'flagged' | 'all';

interface Row {
  id: string;
  street: string;
  city_name: string;
  status: ReportStatus;
  is_hidden: boolean;
  created_at: string;
  flag_count?: number;
  reasons?: FlagReason[];
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('flagged');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res =
      tab === 'flagged'
        ? await supabase.from('flagged_reports').select('*').order('flag_count', { ascending: false })
        : await supabase.from('report_summaries').select('id, street, city_name, status, is_hidden, created_at').order('created_at', { ascending: false });
    if (res.error) setError(errorMessage(res.error));
    else setRows(res.data as (FlaggedReport | ReportSummary)[]);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, label: string, fn: () => Promise<void>) {
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      await fn();
      setMessage(label);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const update = (id: string, patch: Partial<Pick<Row, 'status' | 'is_hidden'>>, label: string) =>
    act(id, label, async () => {
      const { error } = await supabase.from('reports').update(patch).eq('id', id);
      if (error) throw error;
    });

  const dismissFlags = (id: string) =>
    act(id, 'Flags dismissed.', async () => {
      const { error } = await supabase.from('flags').delete().eq('report_id', id);
      if (error) throw error;
    });

  const remove = (row: Row) => {
    if (!window.confirm(`Delete "${row.street}" permanently? This also deletes its photos.`)) return;
    return act(row.id, 'Report deleted.', async () => {
      const { data } = await supabase.from('report_photos').select('storage_path').eq('report_id', row.id);
      const paths = (data ?? []).map((p: { storage_path: string }) => p.storage_path);
      if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
      const { error } = await supabase.from('reports').delete().eq('id', row.id);
      if (error) throw error;
    });
  };

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Admin</p>
        <h1>Moderation</h1>
        <p className="muted">Review flagged reports. Hide spam or abuse, restore mistakes, and update status.</p>
      </header>

      <div className="segmented">
        <button className={tab === 'flagged' ? 'on' : ''} onClick={() => setTab('flagged')}>
          Flagged
        </button>
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
          All reports
        </button>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="error banner">{error}</p>}

      {loading ? (
        <PageState kind="loading" />
      ) : rows.length === 0 ? (
        <PageState kind="empty" message={tab === 'flagged' ? 'No flagged reports. All clear.' : 'No reports yet.'} />
      ) : (
        <div className="card table-card">
          <table className="table admin-table">
            <thead>
              <tr>
                <th>Report</th>
                {tab === 'flagged' && <th>Flags</th>}
                <th>Status</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.is_hidden ? 'row-hidden' : ''}>
                  <td>
                    <Link to={`/reports/${r.id}`} className="strong-link">
                      {r.street}
                    </Link>
                    <div className="muted small">
                      {r.city_name} · {formatDate(r.created_at)}
                    </div>
                  </td>
                  {tab === 'flagged' && (
                    <td>
                      <strong className="flag-count">{r.flag_count}</strong>
                      <div className="muted small">{r.reasons?.map((x) => FLAG_LABEL[x]).join(', ')}</div>
                    </td>
                  )}
                  <td>
                    <select
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) => update(r.id, { status: e.target.value as ReportStatus }, 'Status updated.')}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{r.is_hidden ? <span className="badge badge-hidden">Hidden</span> : <span className="badge badge-visible">Public</span>}</td>
                  <td>
                    <div className="row-actions">
                      {r.is_hidden ? (
                        <button className="btn btn-sm btn-blue" disabled={busyId === r.id} onClick={() => update(r.id, { is_hidden: false }, 'Report restored.')}>
                          Restore
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-ghost" disabled={busyId === r.id} onClick={() => update(r.id, { is_hidden: true }, 'Report hidden.')}>
                          Hide
                        </button>
                      )}
                      {tab === 'flagged' && (
                        <button className="btn btn-sm btn-ghost" disabled={busyId === r.id} onClick={() => dismissFlags(r.id)}>
                          Dismiss flags
                        </button>
                      )}
                      <button className="btn btn-sm btn-ghost-red" disabled={busyId === r.id} onClick={() => remove(r)}>
                        Delete
                      </button>
                    </div>
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

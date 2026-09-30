import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import type { City, ReportStatus, ReportSummary } from '../lib/types';
import { NCR_CENTER, NCR_MAX_BOUNDS, TILE_ATTRIBUTION, TILE_URL } from '../lib/geo';
import { STATUSES, STATUS_LABEL, daysSince, errorMessage, photoUrl } from '../lib/format';
import { pinIcon } from '../components/pins';
import { RatingMeter, StatusBadge, VerifiedBadge } from '../components/Badges';
import DaysCounter from '../components/DaysCounter';
import PageState from '../components/PageState';

type FlyTarget = { center: [number, number]; zoom: number } | null;

function FlyTo({ target }: { target: FlyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, target.zoom, { duration: 0.8 });
  }, [map, target]);
  return null;
}

function PreviewCard({ report, onClose }: { report: ReportSummary; onClose: () => void }) {
  return (
    <article className="preview">
      <button className="preview-close" onClick={onClose} aria-label="Close preview">
        ×
      </button>
      <div className="preview-photo">
        {report.cover_path ? (
          <img src={photoUrl(report.cover_path)} alt={`Roadwork on ${report.street}`} />
        ) : (
          <div className="photo-empty">No photo</div>
        )}
      </div>
      <div className="preview-body">
        <div className="badges">
          <StatusBadge status={report.status} />
          {report.is_verified && <VerifiedBadge />}
        </div>
        <h2 className="preview-title">{report.street}</h2>
        <p className="muted">{report.city_name}</p>
        <DaysCounter since={report.first_noticed} size="sm" />
        <div className="preview-stats">
          <span>
            <strong>{report.confirmation_count}</strong> confirmations
          </span>
          <RatingMeter value={report.avg_rating} />
        </div>
        <Link to={`/reports/${report.id}`} className="btn btn-blue btn-block">
          View details →
        </Link>
      </div>
    </article>
  );
}

export default function MapPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | ''>('');
  const [statuses, setStatuses] = useState<Set<ReportStatus>>(() => new Set(['unfinished', 'resumed']));
  const [selected, setSelected] = useState<ReportSummary | null>(null);
  const [fly, setFly] = useState<FlyTarget>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [c, r] = await Promise.all([
        supabase.from('cities').select('id, name, lat, lng').order('name'),
        supabase.from('report_summaries').select('*').eq('is_hidden', false).order('first_noticed'),
      ]);
      if (c.error) throw c.error;
      if (r.error) throw r.error;
      setCities(c.data as City[]);
      setReports(r.data as ReportSummary[]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => reports.filter((r) => statuses.has(r.status) && (cityId === '' || r.city_id === cityId)),
    [reports, statuses, cityId],
  );

  const stats = useMemo(() => {
    const active = filtered.filter((r) => r.status !== 'reported_finished');
    const avgDays = active.length ? Math.round(active.reduce((s, r) => s + daysSince(r.first_noticed), 0) / active.length) : 0;
    return { active: active.length, verified: active.filter((r) => r.is_verified).length, avgDays };
  }, [filtered]);

  function toggleStatus(s: ReportStatus) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function selectCity(value: string) {
    const id = value === '' ? '' : Number(value);
    setCityId(id);
    setSelected(null);
    const city = cities.find((c) => c.id === id);
    setFly(city ? { center: [city.lat, city.lng], zoom: 14 } : { center: NCR_CENTER, zoom: 11 });
  }

  function selectReport(r: ReportSummary) {
    setSelected(r);
    setFly({ center: [r.lat, r.lng], zoom: 16 });
  }

  return (
    <div className="map-page">
      <aside className="map-panel">
        <p className="eyebrow">Metro Manila · 17 cities</p>
        <h1 className="panel-title">Roadworks that never seem to end.</h1>
        <p className="muted">
          Community-tracked unfinished road diggings. Confirm what you see, rate the inconvenience, and watch the days add up.
        </p>

        <div className="stat-row">
          <div className="stat">
            <span className="stat-num">{stats.active}</span>
            <span className="stat-lbl">active</span>
          </div>
          <div className="stat">
            <span className="stat-num">{stats.verified}</span>
            <span className="stat-lbl">verified</span>
          </div>
          <div className="stat stat-red">
            <span className="stat-num">{stats.avgDays}</span>
            <span className="stat-lbl">avg. days</span>
          </div>
        </div>

        <div className="filters">
          <label className="field">
            <span className="field-label">City</span>
            <select value={cityId} onChange={(e) => selectCity(e.target.value)}>
              <option value="">All NCR</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span className="field-label">Status</span>
            <div className="chips">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip chip-${s}${statuses.has(s) ? ' on' : ''}`}
                  aria-pressed={statuses.has(s)}
                  onClick={() => toggleStatus(s)}
                >
                  <span className="chip-dot" />
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selected ? (
          <PreviewCard report={selected} onClose={() => setSelected(null)} />
        ) : loading ? (
          <PageState kind="loading" message="Loading reports…" />
        ) : error ? (
          <PageState kind="error" message={error}>
            <button className="btn btn-blue" onClick={() => void load()}>
              Try again
            </button>
          </PageState>
        ) : filtered.length === 0 ? (
          <PageState kind="empty" message="No reports match these filters.">
            <Link to="/submit" className="btn btn-red">
              Report a roadwork
            </Link>
          </PageState>
        ) : (
          <ol className="report-list">
            {filtered.slice(0, 50).map((r) => (
              <li key={r.id}>
                <button className="report-item" onClick={() => selectReport(r)}>
                  <span className={`dot dot-${r.status}`} />
                  <span className="report-item-main">
                    <span className="report-item-title">{r.street}</span>
                    <span className="muted small">
                      {r.city_name}
                      {r.is_verified ? ' · Verified' : ''}
                    </span>
                  </span>
                  <span className="report-item-days">
                    {daysSince(r.first_noticed)}
                    <small>days</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </aside>

      <div className="map-wrap">
        <MapContainer center={NCR_CENTER} zoom={11} minZoom={10} maxBounds={NCR_MAX_BOUNDS} className="map" zoomControl>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <FlyTo target={fly} />
          {filtered.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={pinIcon(r.status, r.is_verified, selected?.id === r.id)}
              eventHandlers={{ click: () => selectReport(r) }}
              title={r.street}
            />
          ))}
        </MapContainer>
        <div className="legend">
          {STATUSES.map((s) => (
            <span key={s}>
              <span className={`dot dot-${s}`} /> {STATUS_LABEL[s]}
            </span>
          ))}
          <span>
            <span className="dot dot-ring" /> Verified
          </span>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { FlagReason, ReportSummary } from '../lib/types';
import { TILE_ATTRIBUTION, TILE_URL } from '../lib/geo';
import { FLAG_LABEL, RATING_LABEL, VERIFY_THRESHOLD, errorMessage, formatDate, manilaToday, photoUrl } from '../lib/format';
import { pinIcon } from '../components/pins';
import { RatingMeter, StatusBadge, VerifiedBadge } from '../components/Badges';
import DaysCounter from '../components/DaysCounter';
import RatingInput from '../components/RatingInput';
import PageState from '../components/PageState';

interface Mine {
  confirmedToday: boolean;
  rating: number | null;
  flagged: boolean;
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mine, setMine] = useState<Mine>({ confirmedToday: false, rating: null, flagged: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flagReason, setFlagReason] = useState<FlagReason>('spam');
  const [activePhoto, setActivePhoto] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [r, p] = await Promise.all([
        supabase.from('report_summaries').select('*').eq('id', id).maybeSingle(),
        supabase.from('report_photos').select('storage_path').eq('report_id', id).order('created_at'),
      ]);
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      setReport(r.data as ReportSummary | null);
      setPhotos((p.data ?? []).map((x: { storage_path: string }) => x.storage_path));

      if (userId) {
        const [c, rt, f] = await Promise.all([
          supabase.from('confirmations').select('id').eq('report_id', id).eq('user_id', userId).eq('confirmed_on', manilaToday()).maybeSingle(),
          supabase.from('ratings').select('score').eq('report_id', id).eq('user_id', userId).maybeSingle(),
          supabase.from('flags').select('id').eq('report_id', id).eq('user_id', userId).maybeSingle(),
        ]);
        setMine({
          confirmedToday: !!c.data,
          rating: (rt.data as { score: number } | null)?.score ?? null,
          flagged: !!f.data,
        });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => PromiseLike<{ error: { code?: string; message: string } | null }>, success: string) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    const { error } = await action();
    if (error) {
      setActionError(error.code === '23505' ? 'You already did this.' : error.message);
    } else {
      setNotice(success);
      await load();
    }
    setBusy(false);
  }

  if (loading) return <PageState kind="loading" message="Loading report…" />;
  if (error) return <PageState kind="error" message={error} />;
  if (!report)
    return (
      <PageState kind="empty" message="This report does not exist or has been hidden.">
        <Link to="/" className="btn btn-blue">
          Back to map
        </Link>
      </PageState>
    );

  const isOwner = userId === report.user_id;
  const progress = Math.min(report.confirmer_count, VERIFY_THRESHOLD);

  return (
    <div className="page">
      <Link to="/" className="back">
        ← Back to map
      </Link>

      {notice && <p className="notice">{notice}</p>}
      {actionError && <p className="error banner">{actionError}</p>}
      {report.is_hidden && <p className="warn">This report is hidden from the public.</p>}

      <div className="detail-grid">
        <section className="detail-main">
          <div className="gallery">
            {photos.length > 0 ? (
              <>
                <img className="gallery-main" src={photoUrl(photos[activePhoto] ?? photos[0])} alt={`Roadwork on ${report.street}`} />
                {photos.length > 1 && (
                  <div className="gallery-thumbs">
                    {photos.map((p, i) => (
                      <button key={p} className={i === activePhoto ? 'on' : ''} onClick={() => setActivePhoto(i)} aria-label={`Photo ${i + 1}`}>
                        <img src={photoUrl(p)} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="photo-empty tall">No photos</div>
            )}
          </div>

          <div className="card">
            <div className="badges">
              <StatusBadge status={report.status} />
              {report.is_verified && <VerifiedBadge />}
            </div>
            <h1 className="detail-title">{report.street}</h1>
            <p className="muted">
              {report.city_name} · First noticed {formatDate(report.first_noticed)} · Reported by {report.reporter_name}
            </p>
            {report.description && <p className="description">{report.description}</p>}
            <div className="mini-map">
              <MapContainer center={[report.lat, report.lng]} zoom={16} scrollWheelZoom={false} dragging={false} className="map">
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <Marker position={[report.lat, report.lng]} icon={pinIcon(report.status, report.is_verified, true)} />
              </MapContainer>
            </div>
          </div>
        </section>

        <aside className="detail-side">
          <div className="card card-navy">
            <DaysCounter since={report.first_noticed} />
          </div>

          <div className="card">
            <h2>Still unfinished?</h2>
            <div className="progress" aria-label={`${progress} of ${VERIFY_THRESHOLD} confirmations to verify`}>
              {Array.from({ length: VERIFY_THRESHOLD }, (_, i) => (
                <span key={i} className={i < progress ? 'on' : ''} />
              ))}
            </div>
            <p className="muted small">
              {report.is_verified
                ? `Verified. ${report.confirmation_count} confirmations in total.`
                : `${progress} of ${VERIFY_THRESHOLD} people confirmed. Verified at ${VERIFY_THRESHOLD}.`}
            </p>
            {!session ? (
              <Link to="/login" state={{ from: location.pathname }} className="btn btn-blue btn-block">
                Log in to confirm
              </Link>
            ) : isOwner ? (
              <p className="hint">You can't confirm your own report.</p>
            ) : (
              <button
                className="btn btn-blue btn-block"
                disabled={busy || mine.confirmedToday}
                onClick={() => run(() => supabase.from('confirmations').insert({ report_id: report.id }), 'Thanks! Your confirmation was counted.')}
              >
                {mine.confirmedToday ? 'Confirmed today ✓' : 'Yes, still unfinished'}
              </button>
            )}
          </div>

          <div className="card">
            <h2>Commuter inconvenience</h2>
            <div className="rating-summary">
              <RatingMeter value={report.avg_rating} />
              <span className="muted small">
                {report.rating_count} {report.rating_count === 1 ? 'rating' : 'ratings'}
              </span>
            </div>
            {session ? (
              <>
                <p className="small">{mine.rating ? `Your rating: ${mine.rating} · ${RATING_LABEL[mine.rating]} (tap to change)` : 'Rate how much it affects your commute:'}</p>
                <RatingInput
                  value={mine.rating}
                  disabled={busy}
                  onChange={(score) =>
                    run(
                      () => supabase.from('ratings').upsert({ report_id: report.id, user_id: userId, score }, { onConflict: 'report_id,user_id' }),
                      'Rating saved.',
                    )
                  }
                />
              </>
            ) : (
              <Link to="/login" state={{ from: location.pathname }} className="btn btn-ghost btn-block">
                Log in to rate
              </Link>
            )}
          </div>

          {session && (
            <details className="card flag-box">
              <summary>Report a problem with this post</summary>
              {mine.flagged ? (
                <p className="small muted">You flagged this report. An admin will review it.</p>
              ) : (
                <div className="flag-form">
                  <select value={flagReason} onChange={(e) => setFlagReason(e.target.value as FlagReason)}>
                    {(Object.keys(FLAG_LABEL) as FlagReason[]).map((k) => (
                      <option key={k} value={k}>
                        {FLAG_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-ghost-red"
                    disabled={busy}
                    onClick={() => run(() => supabase.from('flags').insert({ report_id: report.id, reason: flagReason }), 'Flag sent. Thank you.')}
                  >
                    Flag
                  </button>
                </div>
              )}
            </details>
          )}

          {profile?.is_admin && (
            <Link to="/admin" className="btn btn-ghost btn-block">
              Open admin
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

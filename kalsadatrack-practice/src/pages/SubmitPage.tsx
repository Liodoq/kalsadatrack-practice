import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { City, ReportStatus } from '../lib/types';
import { NCR_CENTER, NCR_MAX_BOUNDS, TILE_ATTRIBUTION, TILE_URL, distanceMeters, insideNcr, nearestCity } from '../lib/geo';
import { STATUS_LABEL, errorMessage, manilaToday } from '../lib/format';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, stripAndResize } from '../lib/image';
import { dropPin } from '../components/pins';
import PageState from '../components/PageState';

interface Nearby {
  id: string;
  street: string;
  city_name: string;
  status: ReportStatus;
  distance: number;
}

type Errors = Partial<Record<'pin' | 'city' | 'street' | 'date' | 'description' | 'photos' | 'nearby', string>>;

function PinPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ pin }: { pin: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.setView(pin, Math.max(map.getZoom(), 16));
  }, [map, pin]);
  return null;
}

function Guidelines({ onAccept }: { onAccept: () => Promise<void> }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="card guidelines">
      <p className="eyebrow">Before your first report</p>
      <h1>Community guidelines</h1>
      <ul className="checklist">
        <li>Report only what you can see: the digging, barriers, lane closures, and how long it has been there.</li>
        <li>Do not name or accuse officials, contractors, or any person. KalsadaTrack is a commuter status tool, not an exposé.</li>
        <li>Avoid faces and plate numbers in photos. Location data (EXIF) is removed automatically.</li>
        <li>Be accurate. False or duplicate reports can be flagged and hidden.</li>
      </ul>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        I have read and will follow these guidelines.
      </label>
      <button
        className="btn btn-red"
        disabled={!checked || busy}
        onClick={async () => {
          setBusy(true);
          await onAccept();
          setBusy(false);
        }}
      >
        {busy ? 'Saving…' : 'Continue'}
      </button>
    </section>
  );
}

export default function SubmitPage() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const today = manilaToday();

  const [cities, setCities] = useState<City[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [cityId, setCityId] = useState<number | ''>('');
  const [street, setStreet] = useState('');
  const [firstNoticed, setFirstNoticed] = useState(today);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const [ackNearby, setAckNearby] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('cities')
      .select('id, name, lat, lng')
      .order('name')
      .then(({ data, error }) => (error ? setLoadError(error.message) : setCities(data as City[])));
  }, []);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  async function pick(lat: number, lng: number) {
    if (!insideNcr(lat, lng)) {
      setErrors((e) => ({ ...e, pin: 'That spot is outside Metro Manila (NCR).' }));
      return;
    }
    setErrors((e) => ({ ...e, pin: undefined, nearby: undefined }));
    setPin([lat, lng]);
    const city = nearestCity(cities, lat, lng);
    if (city) setCityId(city.id);
    setAckNearby(false);

    // Warn about similar reports within 50 m
    const { data } = await supabase
      .from('report_summaries')
      .select('id, street, city_name, status, lat, lng')
      .eq('is_hidden', false)
      .gte('lat', lat - 0.0006)
      .lte('lat', lat + 0.0006)
      .gte('lng', lng - 0.0006)
      .lte('lng', lng + 0.0006);
    const rows = (data ?? []) as { id: string; street: string; city_name: string; status: ReportStatus; lat: number; lng: number }[];
    setNearby(
      rows
        .map((r) => ({ ...r, distance: distanceMeters(lat, lng, r.lat, r.lng) }))
        .filter((r) => r.distance <= 50)
        .sort((a, b) => a.distance - b.distance),
    );
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setErrors((e) => ({ ...e, pin: 'Your browser does not support location.' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void pick(pos.coords.latitude, pos.coords.longitude),
      () => setErrors((e) => ({ ...e, pin: 'Could not get your location. Tap the map instead.' })),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const bad = incoming.find((f) => !PHOTO_TYPES.includes(f.type));
    const big = incoming.find((f) => f.size > MAX_PHOTO_BYTES);
    if (bad) return setErrors((e) => ({ ...e, photos: `${bad.name}: use JPEG, PNG, or WebP.` }));
    if (big) return setErrors((e) => ({ ...e, photos: `${big.name} is over 5 MB.` }));
    const next = [...files, ...incoming];
    if (next.length > MAX_PHOTOS) return setErrors((e) => ({ ...e, photos: `Up to ${MAX_PHOTOS} photos only.` }));
    setErrors((e) => ({ ...e, photos: undefined }));
    setFiles(next);
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!pin) e.pin = 'Tap the map to place a pin.';
    if (cityId === '') e.city = 'Choose a city.';
    if (street.trim().length < 2) e.street = 'Enter the street or landmark (at least 2 characters).';
    if (street.trim().length > 120) e.street = 'Keep the street under 120 characters.';
    if (!firstNoticed) e.date = 'Enter the date you first noticed it.';
    else if (firstNoticed > today) e.date = 'The date cannot be in the future.';
    if (description.length > 500) e.description = 'Keep the description under 500 characters.';
    if (files.length === 0) e.photos = 'Add at least 1 photo.';
    if (nearby.length > 0 && !ackNearby) e.nearby = 'Check the similar reports below, or confirm this is a different roadwork.';
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setSubmitError(null);
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean) || !pin || !session) return;

    try {
      setProgress('Saving report…');
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          city_id: cityId,
          street: street.trim(),
          description: description.trim() || null,
          lat: pin[0],
          lng: pin[1],
          first_noticed: firstNoticed,
        })
        .select('id')
        .single();
      if (error) throw error;

      let photoWarning: string | null = null;
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${files.length}…`);
        try {
          const blob = await stripAndResize(files[i]);
          const path = `${session.user.id}/${report.id}/${i + 1}-${Date.now()}.jpg`;
          const up = await supabase.storage.from('report-photos').upload(path, blob, { contentType: 'image/jpeg' });
          if (up.error) throw up.error;
          const row = await supabase.from('report_photos').insert({ report_id: report.id, storage_path: path });
          if (row.error) throw row.error;
        } catch (err) {
          photoWarning = `Report saved, but a photo failed to upload: ${errorMessage(err)}`;
        }
      }
      navigate(`/reports/${report.id}`, { state: { notice: photoWarning ?? 'Report submitted. Thank you!' } });
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setProgress(null);
    }
  }

  if (!profile) return <PageState kind="loading" />;
  if (!profile.accepted_guidelines_at) {
    return (
      <div className="page narrow">
        <Guidelines
          onAccept={async () => {
            await supabase.from('profiles').update({ accepted_guidelines_at: new Date().toISOString() }).eq('id', profile.id);
            await refreshProfile();
          }}
        />
      </div>
    );
  }
  if (loadError) return <PageState kind="error" message={loadError} />;

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">New report</p>
        <h1>Report an unfinished roadwork</h1>
        <p className="muted">Facts only: what you see, where, and since when.</p>
      </header>

      <form className="submit-grid" onSubmit={submit} noValidate>
        <section className="card">
          <div className="card-head">
            <h2>1 · Location</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={locateMe}>
              Use my location
            </button>
          </div>
          <div className="picker">
            <MapContainer center={NCR_CENTER} zoom={12} minZoom={10} maxBounds={NCR_MAX_BOUNDS} className="map">
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              <PinPicker onPick={(lat, lng) => void pick(lat, lng)} />
              <Recenter pin={pin} />
              {pin && <Marker position={pin} icon={dropPin} />}
            </MapContainer>
            {!pin && <div className="picker-hint">Tap the map where the roadwork is</div>}
          </div>
          {errors.pin && <p className="error">{errors.pin}</p>}
          {pin && (
            <p className="muted small mono">
              {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
            </p>
          )}

          {nearby.length > 0 && (
            <div className="warn">
              <strong>Similar reports within 50 m</strong>
              <ul>
                {nearby.map((n) => (
                  <li key={n.id}>
                    <Link to={`/reports/${n.id}`} target="_blank">
                      {n.street}
                    </Link>{' '}
                    · {STATUS_LABEL[n.status]} · {Math.round(n.distance)} m away
                  </li>
                ))}
              </ul>
              <p className="small">If it is the same roadwork, confirm the existing report instead.</p>
              <label className="check">
                <input type="checkbox" checked={ackNearby} onChange={(e) => setAckNearby(e.target.checked)} />
                This is a different roadwork
              </label>
              {errors.nearby && <p className="error">{errors.nearby}</p>}
            </div>
          )}
        </section>

        <section className="card">
          <h2>2 · Details</h2>
          <label className="field">
            <span className="field-label">City</span>
            <select value={cityId} onChange={(e) => setCityId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Choose a city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.city && <span className="error">{errors.city}</span>}
          </label>
          <label className="field">
            <span className="field-label">Street or landmark</span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} maxLength={120} placeholder="e.g. Commonwealth Ave near Batasan Rd" />
            {errors.street && <span className="error">{errors.street}</span>}
          </label>
          <label className="field">
            <span className="field-label">Date first noticed</span>
            <input type="date" value={firstNoticed} max={today} onChange={(e) => setFirstNoticed(e.target.value)} />
            {errors.date && <span className="error">{errors.date}</span>}
          </label>
          <label className="field">
            <span className="field-label">
              What you see <span className="muted">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="e.g. One lane excavated with barriers. No workers seen this week."
            />
            <span className="hint">
              Observable facts only. Do not name people, officials, or contractors. {description.length}/500
            </span>
            {errors.description && <span className="error">{errors.description}</span>}
          </label>

          <div className="field">
            <span className="field-label">Photos (1–3, max 5 MB each)</span>
            <div className="photo-grid">
              {previews.map((src, i) => (
                <figure key={src} className="thumb">
                  <img src={src} alt={`Photo ${i + 1}`} />
                  <button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </figure>
              ))}
              {files.length < MAX_PHOTOS && (
                <label className="thumb thumb-add">
                  <input type="file" accept={PHOTO_TYPES.join(',')} multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                  <span>+ Add photo</span>
                </label>
              )}
            </div>
            <span className="hint">Location data (EXIF) is removed before upload. Avoid faces and plate numbers.</span>
            {errors.photos && <span className="error">{errors.photos}</span>}
          </div>

          {submitError && <p className="error banner">{submitError}</p>}
          <button className="btn btn-red btn-block btn-lg" disabled={progress !== null}>
            {progress ?? 'Submit report'}
          </button>
        </section>
      </form>
    </div>
  );
}

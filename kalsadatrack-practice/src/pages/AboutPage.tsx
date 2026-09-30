import { Link } from 'react-router-dom';
import { VERIFY_THRESHOLD } from '../lib/format';

export default function AboutPage() {
  return (
    <div className="page narrow prose">
      <p className="eyebrow">About</p>
      <h1>A commuter status tool for Metro Manila roads</h1>
      <p>
        KalsadaTrack lets commuters record road diggings that stay unfinished across the 17 cities and municipality of NCR. Every report stays
        public, so anyone can see how long a roadwork has been open and how much it affects daily travel. It covers diggings from any source,
        and is meant to complement official government portals, not replace them.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>A commuter pins the roadwork on the map, adds the street, the date they first noticed it, and 1–3 photos.</li>
        <li>
          Others confirm it is still unfinished (once per day each). After {VERIFY_THRESHOLD} different people confirm, the report is marked{' '}
          <strong>Verified</strong>.
        </li>
        <li>People rate the inconvenience from 1 (minor) to 5 (impassable). Cities are ranked by data, not commentary.</li>
      </ol>

      <h2>Community guidelines</h2>
      <ul>
        <li>Report observable facts only: the digging, barriers, closures, and how long it has been there.</li>
        <li>Do not name or accuse officials, contractors, or any individual.</li>
        <li>Avoid faces and plate numbers in photos.</li>
        <li>Flag spam, duplicates, and false reports. Admins review flags and can hide reports.</li>
      </ul>

      <h2 id="privacy">Privacy notice</h2>
      <p>
        We collect only what the service needs: your email (for login), a display name (shown publicly instead of your real name), and the
        reports, photos, confirmations, ratings, and flags you submit. Photo metadata (EXIF, including GPS and device details) is removed in your
        browser before upload. We do not sell or share your data. This follows the principles of the Data Privacy Act of 2012 (RA 10173). To have
        your account or data removed, contact the project admin.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Reports are submitted by users and reflect what they observed. Status labels like "Reported finished" are community-reported and not
        official project records.
      </p>

      <p className="muted small">
        Map data and tiles © OpenStreetMap contributors. Built for the AppBuildersPH hackathon.
      </p>
      <Link to="/submit" className="btn btn-red">
        Report a roadwork
      </Link>
    </div>
  );
}

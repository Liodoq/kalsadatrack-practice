import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--blue)" />
      <path d="M16 5v5M16 14v5M16 23v4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="9" r="3.4" fill="var(--red)" stroke="#fff" strokeWidth="1.4" />
    </svg>
  );
}

export default function Layout() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <BrandMark />
          <span className="brand-name">
            Kalsada<span>Track</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Map
          </NavLink>
          <NavLink to="/rankings">Rankings</NavLink>
          <NavLink to="/about">About</NavLink>
          {profile?.is_admin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav-actions">
          <Link to="/submit" className="btn btn-red">
            + Report
          </Link>
          {session ? (
            <>
              <span className="whoami" title="Signed in as">
                {profile?.display_name ?? '…'}
              </span>
              <button
                className="btn btn-ghost-light"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-ghost-light">
              Log in
            </Link>
          )}
        </div>
      </header>
      <div className="lane" aria-hidden="true" />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

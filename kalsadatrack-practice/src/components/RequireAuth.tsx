import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import PageState from './PageState';

export default function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (session && !profile)) return <PageState kind="loading" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !profile?.is_admin) return <PageState kind="error" message="This page is for admins only." />;
  return <>{children}</>;
}

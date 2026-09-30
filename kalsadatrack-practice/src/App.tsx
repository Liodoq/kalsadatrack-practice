import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import SubmitPage from './pages/SubmitPage';
import RankingsPage from './pages/RankingsPage';
import AboutPage from './pages/AboutPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MapPage />} />
        <Route path="reports/:id" element={<ReportPage />} />
        <Route
          path="submit"
          element={
            <RequireAuth>
              <SubmitPage />
            </RequireAuth>
          }
        />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<AuthPage />} />
        <Route
          path="admin"
          element={
            <RequireAuth admin>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

import { Link } from 'react-router-dom';
import PageState from '../components/PageState';

export default function NotFoundPage() {
  return (
    <PageState kind="empty" message="This road leads nowhere. Page not found.">
      <Link to="/" className="btn btn-blue">
        Back to map
      </Link>
    </PageState>
  );
}

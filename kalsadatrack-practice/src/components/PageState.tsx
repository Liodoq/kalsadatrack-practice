import type { ReactNode } from 'react';

interface Props {
  kind: 'loading' | 'error' | 'empty';
  message?: string;
  children?: ReactNode;
}

export default function PageState({ kind, message, children }: Props) {
  return (
    <div className={`state state-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'loading' && <span className="spinner" aria-hidden="true" />}
      <p>{message ?? (kind === 'loading' ? 'Loading…' : kind === 'error' ? 'Something went wrong.' : 'Nothing here yet.')}</p>
      {children}
    </div>
  );
}

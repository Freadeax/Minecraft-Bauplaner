import { useEffect, useState } from 'react';
import type { JobProgress } from './protocol';
import './jobs.css';

/**
 * Progress of a background computation (PERF-04): what runs, how far, how
 * long already, and „Abbrechen“. The page stays usable meanwhile.
 */
export function JobStatus({ title, progress, onCancel, className = '' }: {
  title: string;
  progress: JobProgress | null;
  onCancel?: (() => void) | undefined;
  className?: string;
}) {
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const seconds = Math.round((now - started) / 1000);
  const fraction = progress?.fraction ?? null;
  const percent = fraction === null ? null : Math.round(fraction * 100);
  return <div className={`job-status ${className}`.trim()} role="status" aria-live="polite" data-job-step={progress?.step ?? ''}>
    <div className="job-status-head">
      <strong>{title}</strong>
      {progress && <span className="job-status-step">{progress.step}{percent !== null ? ` · ${percent} %` : ''}</span>}
      {seconds >= 2 && <span className="job-status-time">{seconds} s</span>}
    </div>
    <div className={`job-bar${percent === null ? ' unknown' : ''}`} role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} {...(percent !== null && { 'aria-valuenow': percent })}>
      <span style={percent === null ? undefined : { width: `${Math.max(2, percent)}%` }} />
    </div>
    {onCancel && <button type="button" className="job-cancel" onClick={onCancel}>Abbrechen</button>}
  </div>;
}

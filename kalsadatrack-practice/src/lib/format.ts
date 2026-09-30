import { PHOTO_BUCKET, supabase } from './supabase';
import type { FlagReason, ReportStatus } from './types';

export const STATUSES: ReportStatus[] = ['unfinished', 'resumed', 'reported_finished'];

export const STATUS_LABEL: Record<ReportStatus, string> = {
  unfinished: 'Unfinished',
  resumed: 'Resumed',
  reported_finished: 'Reported finished',
};

export const FLAG_LABEL: Record<FlagReason, string> = {
  spam: 'Spam',
  duplicate: 'Duplicate report',
  false: 'False or inaccurate',
  inappropriate: 'Shows faces, plates, or names',
};

export const RATING_LABEL = ['', 'Minor', 'Noticeable', 'Disruptive', 'Severe', 'Impassable'];

export const VERIFY_THRESHOLD = 3;

/** Today's date in Manila as YYYY-MM-DD. */
export function manilaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

/** Midnight (Manila) of a YYYY-MM-DD date, in epoch ms. */
export function manilaMidnight(date: string): number {
  return new Date(`${date}T00:00:00+08:00`).getTime();
}

export function daysSince(date: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - manilaMidnight(date)) / 86_400_000));
}

export function formatDate(value: string): string {
  const d = value.length === 10 ? new Date(manilaMidnight(value)) : new Date(value);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
}

export function photoUrl(path: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}

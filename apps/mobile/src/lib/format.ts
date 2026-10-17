import type { Cents } from '@finni/shared';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** 123456 → "$1,234.56". `signed` adds +/− (money in/out never relies on color alone). */
export function formatMoney(cents: Cents, opts: { signed?: boolean } = {}): string {
  const s = usd.format(Math.abs(cents) / 100);
  if (!opts.signed) return cents < 0 ? `−${s}` : s;
  return cents < 0 ? `−${s}` : `+${s}`;
}

/** 136420 → { whole: "$1,364", cents: ".20" }, for hero amounts that set cents lighter. */
export function splitMoney(cents: Cents): { whole: string; cents: string } {
  const s = formatMoney(cents);
  const dot = s.lastIndexOf('.');
  return { whole: s.slice(0, dot), cents: s.slice(dot) };
}

/** Greeting word for an hour of the day (0–23). Late night still reads as evening. */
export function timeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

const DAY = 86_400_000;

/** Calendar dates ("2026-10-20") are parsed as local midnight, not UTC. */
function parse(date: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
}

/** "today", "tomorrow", "in 3 days", "yesterday", "5 days ago", else "Oct 20". */
export function formatRelativeDay(date: string): string {
  const d = parse(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / DAY);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 1 && diff <= 7) return `in ${diff} days`;
  if (diff < -1 && diff >= -7) return `${-diff} days ago`;
  return formatShortDate(date);
}

export function formatShortDate(date: string): string {
  return parse(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

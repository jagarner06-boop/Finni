import type { AttentionStatus } from '@/components/home/AttentionRow';

// Stand-in Home data from the design mockup. The API doesn't expose credit utilization,
// statement dates, nudge copy, or attention items yet; replace these once it does.
export const HOME_DEMO = {
  name: 'Gabe',
  hero: { name: 'Closer Card', mask: '4821', balanceCents: 136_420 },
  utilization: { percent: 68, closesInDays: 6, limitCents: 200_000 },
  nudge: { text: 'I can drop your utilization to 9% before Oct 22.', highlight: '9%', cta: 'Review plan →' },
  attention: [
    { id: 'dup_spotify', title: 'Duplicate charge', meta: 'Spotify · $14.99 · Oct 14', status: 'danger' as AttentionStatus },
    { id: 'trial_hulu', title: 'Free trial converted', meta: 'Hulu · $17.99 · Oct 12', status: 'warning' as AttentionStatus },
  ],
};

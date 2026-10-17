import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from '@/api/endpoints';
import { qk, useNudges } from '@/api/queries';
import { notifyLocal } from './notifications';
import { useForegroundPoll } from './useForegroundPoll';

const POLL_MS = 60_000;

/**
 * Mount once inside the signed-in area. Polls GET /nudges on foreground + every
 * 60s, fires a local notification for each nudge the server hasn't marked as
 * notified, then marks it. Returns the unread count for the Inbox tab badge.
 */
export function useNudgeNotifier(): number {
  const client = useQueryClient();
  const { data } = useNudges();
  const fired = useRef(new Set<string>()); // guards against double-firing before the mark lands

  useForegroundPoll(() => client.invalidateQueries({ queryKey: qk.nudges }), POLL_MS);

  useEffect(() => {
    for (const n of data?.nudges ?? []) {
      if (n.notifiedAt || fired.current.has(n.id)) continue;
      fired.current.add(n.id);
      void notifyLocal(n.title, n.body, { nudgeId: n.id });
      api.markNudgeNotified(n.id).catch(() => {});
    }
  }, [data]);

  return (data?.nudges ?? []).filter((n) => !n.readAt).length;
}

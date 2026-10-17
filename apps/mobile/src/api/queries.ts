import type { BootstrapRequest, ChatRequest, NudgesResponse, UpdateSettingsRequest, CreateActionRequest, CreateGoalRequest, PendingActionStatus } from '@finni/shared';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getLocation } from '@/lib/location';
import { ApiError } from './client';
import { api } from './endpoints';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't hammer the API on auth/validation errors; retry network blips once.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
    },
    mutations: { retry: false },
  },
});

export const qk = {
  me: ['me'] as const,
  history: ['chat', 'history'] as const,
  accounts: ['accounts'] as const,
  goals: ['goals'] as const,
  actions: (status?: PendingActionStatus) => ['actions', status ?? 'all'] as const,
  action: (id: string) => ['action', id] as const,
  bills: ['bills'] as const,
  nudges: ['nudges'] as const,
  home: ['home'] as const,
  transactions: (accountId?: string) => ['transactions', accountId ?? 'all'] as const,
  settings: ['settings'] as const,
  contributionLimit: (accountId?: string) => ['contribution-limit', accountId ?? 'none'] as const,
};

/** Money moved / created: everything showing balances or actions is stale. */
async function invalidateMoney(client: QueryClient) {
  await Promise.all([qk.me, qk.accounts, qk.goals, qk.bills, ['actions'], qk.history, qk.home, ['transactions'], qk.nudges, ['contribution-limit']].map((key) =>
    client.invalidateQueries({ queryKey: key }),
  ));
}

// ---------- Session ----------

export function useMe(opts: { enabled?: boolean; pollUntilSeeded?: boolean } = {}) {
  return useQuery({
    queryKey: qk.me,
    queryFn: api.me,
    enabled: opts.enabled ?? true,
    // While persona seeding runs after bootstrap, poll until `seeded` flips.
    refetchInterval: (q) => (opts.pollUntilSeeded && q.state.data?.seeded === false ? 1500 : false),
  });
}

export function useBootstrap() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body?: BootstrapRequest) => api.bootstrap(body),
    onSuccess: async (res) => {
      client.setQueryData(qk.me, res.me);
      await Promise.all([qk.home, qk.settings].map((queryKey) => client.invalidateQueries({ queryKey })));
    },
  });
}

// ---------- Chat ----------

export function useChatHistory() {
  return useQuery({ queryKey: qk.history, queryFn: () => api.chatHistory() });
}

export function useSendChat() {
  const client = useQueryClient();
  return useMutation({
    // Location is attached here so callers only pass the text.
    mutationFn: async (message: string) => {
      const location = await getLocation();
      const body: ChatRequest = location ? { message, location } : { message };
      return api.sendChat(body);
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: qk.history }),
      client.invalidateQueries({ queryKey: ['actions'] }),
    ]),
  });
}

// ---------- Money ----------

export const useAccounts = () => useQuery({ queryKey: qk.accounts, queryFn: api.accounts });
export const useGoals = () => useQuery({ queryKey: qk.goals, queryFn: api.goals });
export const useContributionLimit = (accountId?: string) => useQuery({ queryKey: qk.contributionLimit(accountId), queryFn: () => api.contributionLimit(accountId!), enabled: !!accountId });
export const useBills = () => useQuery({ queryKey: qk.bills, queryFn: api.bills });

// ---------- Actions (approval flow) ----------

export const usePendingActions = () =>
  useQuery({ queryKey: qk.actions('pending'), queryFn: () => api.actions({ status: 'pending' }) });

export const useAction = (id: string) =>
  useQuery({ queryKey: qk.action(id), queryFn: () => api.action(id), enabled: !!id });

export function useCreateAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateActionRequest) => api.createAction(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useCreateGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGoalRequest) => api.createGoal(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['actions'] }),
  });
}

/** Step-up (403 → MFA → retry) is handled inside apiFetch. */
export function useApproveAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.approveAction(id),
    onSuccess: async (res) => {
      client.setQueryData(qk.action(res.action.id), res);
      await invalidateMoney(client);
    },
  });
}

export function useRejectAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rejectAction(id),
    onSuccess: async (res) => {
      client.setQueryData(qk.action(res.action.id), res);
      await Promise.all([client.invalidateQueries({ queryKey: ['actions'] }), client.invalidateQueries({ queryKey: qk.history })]);
    },
  });
}

// ---------- Nudges ----------

export const useNudges = () => useQuery({ queryKey: qk.nudges, queryFn: api.nudges });

export function useMarkNudgeRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNudgeRead(id),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.nudges }),
  });
}

/** Demo trigger: force a nudge scan (long-press Finn). */
export function useScanNudges() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.scanNudges,
    onSuccess: (res) => client.setQueryData(qk.nudges, { nudges: res.nudges }),
  });
}

export function useDismissNudge() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.dismissNudge(id),
    // Optimistic: the card disappears right away; roll back if the API says no.
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: qk.nudges });
      const prev = client.getQueryData<NudgesResponse>(qk.nudges);
      if (prev) client.setQueryData<NudgesResponse>(qk.nudges, { nudges: prev.nudges.filter((n) => n.id !== id) });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) client.setQueryData(qk.nudges, ctx.prev);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: qk.nudges });
      client.invalidateQueries({ queryKey: qk.home });
      client.invalidateQueries({ queryKey: ['contribution-limit'] });
    },
  });
}

/** Creates a PendingAction; the caller routes to `/approve/<id>`. */
export function useActOnNudge() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.actOnNudge(id),
    onSuccess: (res) => {
      client.setQueryData(qk.action(res.action.id), res);
      client.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

// ---------- Home, activity, settings ----------

export const useHome = () => useQuery({ queryKey: qk.home, queryFn: api.home });

export const useTransactions = (accountId?: string) =>
  useQuery({ queryKey: qk.transactions(accountId), queryFn: () => api.transactions({ accountId }) });

export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: api.settings });

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSettingsRequest) => api.updateSettings(body),
    onSuccess: async (res) => {
      client.setQueryData(qk.settings, res);
      await Promise.all([client.invalidateQueries({ queryKey: qk.home }), client.invalidateQueries({ queryKey: qk.me }), client.invalidateQueries({ queryKey: ['contribution-limit'] })]);
    },
  });
}

/** Fresh persona; the session gate polls GET /me until seeding finishes. */
export function useResetDemo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.resetDemo,
    onSuccess: (res) => {
      client.setQueryData(qk.me, res.me);
      invalidateMoney(client);
      client.invalidateQueries({ queryKey: qk.settings });
    },
  });
}

export function useClearChat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.clearChat,
    onSuccess: () => client.invalidateQueries({ queryKey: qk.history }),
  });
}

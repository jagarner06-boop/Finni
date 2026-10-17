import type { ChatRequest, CreateActionRequest, CreateGoalRequest, PendingActionStatus } from '@finni/shared';
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
};

/** Money moved / created: everything showing balances or actions is stale. */
function invalidateMoney(client: QueryClient) {
  for (const key of [qk.me, qk.accounts, qk.goals, qk.bills, ['actions'], qk.history]) {
    client.invalidateQueries({ queryKey: key });
  }
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
    mutationFn: api.bootstrap,
    onSuccess: (res) => client.setQueryData(qk.me, res.me),
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
    onSuccess: () => client.invalidateQueries({ queryKey: qk.history }),
  });
}

// ---------- Money ----------

export const useAccounts = () => useQuery({ queryKey: qk.accounts, queryFn: api.accounts });
export const useGoals = () => useQuery({ queryKey: qk.goals, queryFn: api.goals });
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
    onSuccess: (res) => {
      client.setQueryData(qk.action(res.action.id), res);
      invalidateMoney(client);
    },
  });
}

export function useRejectAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rejectAction(id),
    onSuccess: (res) => {
      client.setQueryData(qk.action(res.action.id), res);
      client.invalidateQueries({ queryKey: ['actions'] });
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

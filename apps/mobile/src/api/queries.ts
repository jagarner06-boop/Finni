import type { ChatMessage, ChatRequest, ChatResponse, MeResponse } from '@finni/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';

import { apiFetch } from './client';

export const queryKeys = {
  me: ['me'] as const,
  history: ['chat', 'history'] as const,
};

/** First-login setup (idempotent): creates the Nessie customer + accounts, returns the profile. */
export function useBootstrap() {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.me,
    enabled: !!accessToken,
    queryFn: () =>
      apiFetch<MeResponse>('/me/bootstrap', accessToken, {
        method: 'POST',
        body: JSON.stringify({ firstName: user?.givenName ?? user?.name?.split(' ')[0], email: user?.email }),
      }),
    staleTime: Infinity,
  });
}

export function useChatHistory(enabled: boolean) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.history,
    enabled: enabled && !!accessToken,
    queryFn: () => apiFetch<{ messages: ChatMessage[] }>('/chat/history', accessToken).then((r) => r.messages),
  });
}

export function useSendMessage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ChatRequest) => apiFetch<ChatResponse>('/chat', accessToken, { method: 'POST', body: JSON.stringify(req) }),
    // Optimistic user bubble; Finn's reply is appended on success.
    onMutate: async (req) => {
      await qc.cancelQueries({ queryKey: queryKeys.history });
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        text: req.message,
        mood: null,
        cards: [],
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ChatMessage[]>(queryKeys.history, (old = []) => [...old, optimistic]);
    },
    onSuccess: ({ reply }) => {
      qc.setQueryData<ChatMessage[]>(queryKeys.history, (old = []) => [...old, reply]);
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: queryKeys.history });
    },
  });
}

import type {
  AccountsResponse,
  ActionResponse,
  ActionsQuery,
  ActionsResponse,
  BillsResponse,
  BootstrapResponse,
  ChatHistoryResponse,
  ChatRequest,
  ChatResponse,
  CreateActionRequest,
  CreateGoalRequest,
  GoalsResponse,
  HealthResponse,
  Me,
  NudgeScanResponse,
  NudgesResponse,
} from '@finni/shared';

import { config } from '@/config';
import { apiFetch } from './client';
import { mockApi } from './mocks';

// One typed function per backend route (Component Plan 1). Keep in sync with apps/api/src/routes.
const realApi = {
  health: () => apiFetch<HealthResponse>('/health', { anonymous: true }),

  bootstrap: () => apiFetch<BootstrapResponse>('/me/bootstrap', { method: 'POST' }),
  me: () => apiFetch<Me>('/me'),

  sendChat: (body: ChatRequest) => apiFetch<ChatResponse>('/chat', { method: 'POST', body }),
  chatHistory: (limit = 50) => apiFetch<ChatHistoryResponse>('/chat/history', { query: { limit } }),

  accounts: () => apiFetch<AccountsResponse>('/accounts'),

  goals: () => apiFetch<GoalsResponse>('/goals'),
  createGoal: (body: CreateGoalRequest) =>
    apiFetch<ActionResponse>('/goals', { method: 'POST', body }),

  actions: (q: ActionsQuery = {}) =>
    apiFetch<ActionsResponse>('/actions', { query: { status: q.status } }),
  action: (id: string) => apiFetch<ActionResponse>(`/actions/${id}`),
  createAction: (body: CreateActionRequest) =>
    apiFetch<ActionResponse>('/actions', { method: 'POST', body }),
  approveAction: (id: string) =>
    apiFetch<ActionResponse>(`/actions/${id}/approve`, { method: 'POST' }),
  rejectAction: (id: string) =>
    apiFetch<ActionResponse>(`/actions/${id}/reject`, { method: 'POST' }),

  bills: () => apiFetch<BillsResponse>('/bills'),

  nudges: () => apiFetch<NudgesResponse>('/nudges'),
  markNudgeRead: (id: string) => apiFetch<void>(`/nudges/${id}/read`, { method: 'POST' }),
  markNudgeNotified: (id: string) => apiFetch<void>(`/nudges/${id}/notified`, { method: 'POST' }),
  scanNudges: () => apiFetch<NudgeScanResponse>('/nudges/scan', { method: 'POST' }),
};

export type Api = typeof realApi;

export const api: Api = config.useMocks ? mockApi : realApi;

import type {
  AccountsResponse,
  ActionResponse,
  ActionsQuery,
  ActionsResponse,
  BillsResponse,
  BootstrapRequest,
  BootstrapResponse,
  ChatHistoryResponse,
  ChatRequest,
  ChatResponse,
  CreateActionRequest,
  CreateGoalRequest,
  GoalsResponse,
  HealthResponse,
  HomeResponse,
  Me,
  NudgeScanResponse,
  NudgesResponse,
  SettingsResponse,
  TransactionsResponse,
  UpdateSettingsRequest,
} from '@finni/shared';

import { config } from '@/config';
import { apiFetch } from './client';

// One typed function per backend route (Component Plan 1). Keep in sync with apps/api/src/routes.
const realApi = {
  health: () => apiFetch<HealthResponse>('/health', { anonymous: true }),

  bootstrap: (body?: BootstrapRequest) =>
    apiFetch<BootstrapResponse>('/me/bootstrap', {
      method: 'POST',
      body: body ?? (config.authMode === 'demo' && config.demoName ? { firstName: config.demoName } : undefined),
    }),
  me: () => apiFetch<Me>('/me'),

  sendChat: (body: ChatRequest) => apiFetch<ChatResponse>('/chat', { method: 'POST', body }),
  chatHistory: (limit = 50) => apiFetch<ChatHistoryResponse>('/chat/history', { query: { limit } }),

  home: () => apiFetch<HomeResponse>('/home'),
  transactions: (q: { days?: number; accountId?: string } = {}) =>
    apiFetch<TransactionsResponse>('/transactions', { query: { days: q.days, accountId: q.accountId } }),

  settings: () => apiFetch<SettingsResponse>('/settings'),
  updateSettings: (body: UpdateSettingsRequest) =>
    apiFetch<SettingsResponse>('/settings', { method: 'PATCH', body }),
  resetDemo: () => apiFetch<BootstrapResponse>('/me/reset', { method: 'POST' }),
  clearChat: () => apiFetch<void>('/chat/history', { method: 'DELETE' }),
  stepUp: () => apiFetch<void>('/me/step-up', { method: 'POST' }),

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
    apiFetch<ActionResponse>(`/actions/${id}/approve`, { method: 'POST', withIdToken: true }),
  rejectAction: (id: string) =>
    apiFetch<ActionResponse>(`/actions/${id}/reject`, { method: 'POST' }),

  bills: () => apiFetch<BillsResponse>('/bills'),

  nudges: () => apiFetch<NudgesResponse>('/nudges'),
  markNudgeRead: (id: string) => apiFetch<void>(`/nudges/${id}/read`, { method: 'POST' }),
  markNudgeNotified: (id: string) => apiFetch<void>(`/nudges/${id}/notified`, { method: 'POST' }),
  dismissNudge: (id: string) => apiFetch<void>(`/nudges/${id}/dismiss`, { method: 'POST' }),
  actOnNudge: (id: string) => apiFetch<ActionResponse>(`/nudges/${id}/act`, { method: 'POST' }),
  scanNudges: () => apiFetch<NudgeScanResponse>('/nudges/scan', { method: 'POST' }),
};

export type Api = typeof realApi;

export const api: Api = realApi;

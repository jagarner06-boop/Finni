import type { Cents } from './money';
import type {
  Account,
  Bill,
  ChatMessage,
  Card,
  Goal,
  ISODate,
  LatLng,
  Me,
  Nudge,
  PendingAction,
  PendingActionStatus,
} from './types';

// ---------- Auth contract ----------

/** Error code the API returns (403) when an action needs a fresh MFA login. */
export const STEP_UP_REQUIRED = 'step_up_required';
/** Header carrying the Auth0 ID token on approvals; its auth_time proves a recent re-login. */
export const ID_TOKEN_HEADER = 'x-finni-id-token';
/** Custom access-token claim stamped by the Auth0 post-login Action after MFA. */
export const MFA_AT_CLAIM = 'https://finni.app/mfa_at';
/** acr_values the client sends to Auth0 to request MFA. */
export const MFA_ACR = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';

export interface ApiErrorBody {
  error: string;
  message?: string;
}

// ---------- Request / response bodies ----------

export interface ChatRequest {
  message: string;
  location?: LatLng;
}

export interface ChatResponse {
  reply: ChatMessage;
  cards: Card[];
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface BootstrapResponse {
  me: Me;
  created: boolean;
}

export interface AccountsResponse {
  accounts: Account[];
}

export interface GoalsResponse {
  goals: Goal[];
}

export interface CreateGoalRequest {
  name: string;
  emoji?: string;
  targetCents: Cents;
  targetDate?: ISODate;
}

/** UI-initiated pending actions (Goals "+ Add money", Money "Pay", nudge buttons). */
export type CreateActionRequest =
  | { type: 'transfer'; fromAccountId: string; toAccountId: string; amountCents: Cents; reason?: string }
  | { type: 'bill_payment'; billId: string; fromAccountId?: string }
  | ({ type: 'create_goal' } & CreateGoalRequest);

export interface ActionResponse {
  action: PendingAction;
}

export interface ActionsResponse {
  actions: PendingAction[];
}

export interface ActionsQuery {
  status?: PendingActionStatus;
}

export interface BillsResponse {
  bills: Bill[];
}

export interface NudgesResponse {
  nudges: Nudge[];
}

export interface NudgeScanResponse {
  created: number;
  nudges: Nudge[];
}

export interface HealthResponse {
  ok: boolean;
  time?: string;
}

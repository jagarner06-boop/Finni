// In-memory fake backend (EXPO_PUBLIC_USE_MOCKS=1) shaped like the "Alex, UF junior"
// persona, so the app can be built before the API exists. Not a source of truth:
// the backend contract lives in @finni/shared.
import type {
  Account,
  Bill,
  Card,
  ChatMessage,
  Goal,
  Mood,
  Nudge,
  PendingAction,
  Transaction,
} from '@finni/shared';

import { authBridge } from '@/auth/authBridge';
import type { Api } from './endpoints';

const STEP_UP_THRESHOLD_CENTS = 10_000;
const LATENCY_MS = 400;

const sleep = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

const accounts: Account[] = [
  { id: 'acc_checking', nickname: 'Everyday', type: 'Checking', balanceCents: 124_000, isGoal: false },
  { id: 'acc_savings', nickname: 'Rainy Day', type: 'Savings', balanceCents: 40_000, isGoal: false },
  { id: 'acc_goal_sb', nickname: '🌴 Spring Break', type: 'Savings', balanceCents: 27_000, isGoal: true, goalId: 'goal_sb' },
];

const goals: Goal[] = [
  {
    id: 'goal_sb',
    name: 'Spring Break',
    emoji: '🌴',
    targetCents: 60_000,
    currentCents: 27_000,
    percent: 45,
    targetDate: '2027-03-07',
    nessieAccountId: 'acc_goal_sb',
    milestonesHit: [25],
    status: 'active',
    createdAt: now(),
  },
];

const bills: Bill[] = [
  { id: 'bill_phone', accountId: 'acc_checking', payee: 'Visible', nickname: 'Phone', amountCents: 4_500, dueDate: daysFromNow(2), status: 'pending' },
  { id: 'bill_gru', accountId: 'acc_checking', payee: 'GRU', nickname: 'Electric', amountCents: 8_200, dueDate: daysFromNow(12), status: 'pending' },
  { id: 'bill_rent', accountId: 'acc_checking', payee: 'Landlord', nickname: 'Rent', amountCents: 75_000, dueDate: null, recurringDate: 1, status: 'recurring' },
];

const transactions: Transaction[] = [
  { id: 't1', accountId: 'acc_checking', merchantName: 'DoorDash', category: 'Food delivery', amountCents: 2_740, date: daysFromNow(-1) },
  { id: 't2', accountId: 'acc_checking', merchantName: 'Starbucks', category: 'Coffee', amountCents: 615, date: daysFromNow(-1) },
  { id: 't3', accountId: 'acc_checking', merchantName: 'DoorDash', category: 'Food delivery', amountCents: 1_890, date: daysFromNow(-3) },
  { id: 't4', accountId: 'acc_checking', merchantName: 'Publix', category: 'Groceries', amountCents: 6_212, date: daysFromNow(-4) },
  { id: 't5', accountId: 'acc_checking', merchantName: 'DoorDash', category: 'Food delivery', amountCents: 3_150, date: daysFromNow(-5) },
  { id: 't6', accountId: 'acc_checking', merchantName: 'Starbucks', category: 'Coffee', amountCents: 545, date: daysFromNow(-6) },
];

let actions: PendingAction[] = [];
let history: ChatMessage[] = [];
let nudges: Nudge[] = [];

function finn(text: string, mood: Mood, cards: Card[] = []): ChatMessage {
  return { id: uid(), role: 'finn', text, mood, cards, createdAt: now() };
}

function proposeTransfer(toAccountId: string, amountCents: number, reason: string): PendingAction {
  const to = accounts.find((a) => a.id === toAccountId)!;
  const action: PendingAction = {
    id: uid(),
    type: 'transfer',
    title: `Move $${amountCents / 100} to ${to.nickname}`,
    amountCents,
    fromLabel: 'Everyday',
    toLabel: to.nickname,
    reason,
    requiresStepUp: amountCents >= STEP_UP_THRESHOLD_CENTS,
    status: 'pending',
    source: 'chat',
    createdAt: now(),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    executedAt: null,
    error: null,
  };
  actions.push(action);
  return action;
}

function approvalCard(a: PendingAction): Card {
  return {
    type: 'approval',
    actionId: a.id,
    actionType: a.type,
    title: a.title,
    amountCents: a.amountCents,
    fromLabel: a.fromLabel,
    toLabel: a.toLabel,
    requiresStepUp: a.requiresStepUp,
    status: a.status,
    expiresAt: a.expiresAt,
  };
}

/** Keyword router standing in for the Gemini agent. */
function reply(message: string): ChatMessage {
  const m = message.toLowerCase();
  if (m.includes('atm')) {
    return finn("Here are the closest ATMs I could find 🏧", 'happy', [
      {
        type: 'atm_list',
        usedFallback: true,
        note: "Nessie's sandbox doesn't have ATMs near you yet, so here are some from the demo area.",
        atms: [
          { id: 'atm1', name: 'Capital One ATM', address: '1600 Pennsylvania Ave NW', lat: 38.8977, lng: -77.0365, distanceMiles: 0.4, hours: ['24/7'] },
          { id: 'atm2', name: 'Capital One Café', address: '1 Dupont Cir NW', lat: 38.9096, lng: -77.0434, distanceMiles: 1.2, hours: ['7am–7pm'] },
        ],
      },
    ]);
  }
  if (m.includes('bill')) {
    return finn('Your phone bill is due in 2 days, heads up!', 'worried', [{ type: 'bill_list', bills }]);
  }
  if (m.includes('goal') || m.includes('spring break')) {
    const a = proposeTransfer('acc_goal_sb', 6_000, 'Toward Spring Break');
    return finn("Let's get you closer to that beach 🌴 Just tap Approve.", 'happy', [
      { type: 'goal_progress', goals },
      approvalCard(a),
    ]);
  }
  if (m.includes('savings') || m.includes('move')) {
    const a = proposeTransfer('acc_savings', 20_000, 'Boost rainy day fund');
    return finn('I can set that up! Just tap Approve.', 'happy', [approvalCard(a)]);
  }
  if (m.includes('spend') || m.includes('food')) {
    return finn('Heads up, food delivery is running hot this week 🫧', 'worried', [
      {
        type: 'spending_breakdown',
        days: 7,
        groupBy: 'category',
        totalCents: 15_152,
        items: [
          { label: 'Food delivery', amountCents: 7_780, percent: 51 },
          { label: 'Groceries', amountCents: 6_212, percent: 41 },
          { label: 'Coffee', amountCents: 1_160, percent: 8 },
        ],
      },
    ]);
  }
  if (m.includes('buy') || m.includes('starbucks') || m.includes('purchase')) {
    return finn("Here's what you've bought recently.", 'happy', [
      { type: 'transaction_list', title: 'Last 7 days', transactions },
    ]);
  }
  return finn("You've got $1,240 in Everyday. Want me to dig into anything? 🐟", 'happy', [
    { type: 'account_list', accounts },
  ]);
}

export const mockApi: Api = {
  health: async () => ({ ok: true, time: now() }),

  bootstrap: async () => {
    await sleep();
    return { me: await mockApi.me(), created: false };
  },
  me: async () => ({ id: 'user_mock', email: 'alex@finni.app', firstName: 'Alex', seeded: true, accounts }),

  sendChat: async ({ message }) => {
    await sleep(900);
    history.push({ id: uid(), role: 'user', text: message, mood: null, cards: [], createdAt: now() });
    const msg = reply(message);
    history.push(msg);
    return { reply: msg, cards: msg.cards };
  },
  chatHistory: async (limit = 50) => ({ messages: history.slice(-limit) }),

  accounts: async () => ({ accounts }),

  goals: async () => ({ goals }),
  createGoal: async (body) => mockApi.createAction({ type: 'create_goal', ...body }),

  actions: async (q = {}) => ({ actions: actions.filter((a) => !q.status || a.status === q.status) }),
  action: async (id) => {
    const action = actions.find((a) => a.id === id);
    if (!action) throw new Error('not_found');
    return { action };
  },
  createAction: async (body) => {
    await sleep();
    if (body.type === 'transfer') {
      return { action: { ...proposeTransfer(body.toAccountId, body.amountCents, body.reason ?? ''), source: 'ui' } };
    }
    const action: PendingAction = {
      id: uid(),
      type: body.type,
      title: body.type === 'create_goal' ? `Start goal: ${body.name}` : 'Pay bill',
      amountCents: body.type === 'bill_payment' ? (bills.find((b) => b.id === body.billId)?.amountCents ?? 0) : null,
      requiresStepUp: false,
      status: 'pending',
      source: 'ui',
      createdAt: now(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      executedAt: null,
      error: null,
    };
    actions.push(action);
    return { action };
  },
  approveAction: async (id) => {
    await sleep();
    const action = actions.find((a) => a.id === id);
    if (!action) throw new Error('not_found');
    // Mirror the real flow: big actions need an MFA step-up first.
    if (action.requiresStepUp && !(await authBridge.stepUp())) throw new Error('step_up_cancelled');
    action.status = 'executed';
    action.executedAt = now();
    history.push(finn('Done! Nice work 🎉', 'celebrating'));
    return { action };
  },
  rejectAction: async (id) => {
    actions = actions.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a));
    return { action: actions.find((a) => a.id === id)! };
  },

  bills: async () => ({ bills }),

  nudges: async () => ({ nudges }),
  markNudgeRead: async (id) => {
    nudges = nudges.map((n) => (n.id === id ? { ...n, readAt: now() } : n));
  },
  markNudgeNotified: async (id) => {
    nudges = nudges.map((n) => (n.id === id ? { ...n, notifiedAt: now() } : n));
  },
  scanNudges: async () => {
    const created: Nudge[] = [
      {
        id: uid(),
        rule: 'bill_due',
        title: 'Phone bill due in 2 days',
        body: 'Your $45 Visible bill is due soon. Want me to pay it? 📱',
        mood: 'worried',
        action: { type: 'propose_bill_payment', billId: 'bill_phone' },
        notifiedAt: null,
        readAt: null,
        createdAt: now(),
      },
    ];
    nudges = [...created, ...nudges];
    return { created: created.length, nudges };
  },
};

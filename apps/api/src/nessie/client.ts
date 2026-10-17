import { env } from "../env.js";
import { isoDay } from "../lib/dates.js";
import type {
  NessieAccount,
  NessieAccountType,
  NessieAtm,
  NessieBill,
  NessieCreateResponse,
  NessieCustomer,
  NessieDeposit,
  NessieMerchant,
  NessiePurchase,
  NessieWithdrawal,
} from "./types.js";

// http:// fails for this host; https only.
const BASE = "https://api.nessieisreal.com";
const GET_TTL_MS = 30_000;

export class NessieError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const cache = new Map<string, { at: number; data: unknown }>();
let cacheEpoch = 0;
let activeWrites = 0;

function url(path: string, query: Record<string, string | number | undefined> = {}) {
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v));
  u.searchParams.set("key", env.NESSIE_KEY);
  return u;
}

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Record<string, string | number | undefined>; body?: unknown; ttlMs?: number; emptyList?: boolean } = {},
): Promise<T> {
  if (method === 'GET') return requestUncached<T>(method, path, opts);
  cacheEpoch++;
  activeWrites++;
  cache.clear();
  try {
    return await requestUncached<T>(method, path, opts);
  } finally {
    activeWrites--;
    cacheEpoch++;
    cache.clear();
  }
}

async function requestUncached<T>(method: string, path: string, opts: { query?: Record<string, string | number | undefined>; body?: unknown; ttlMs?: number; emptyList?: boolean }): Promise<T> {
  const startedAtEpoch = cacheEpoch;
  const canCache = () => method === 'GET' && activeWrites === 0 && startedAtEpoch === cacheEpoch;
  const u = url(path, opts.query);
  const cacheKey = u.toString();
  const ttl = opts.ttlMs ?? GET_TTL_MS;

  if (method === "GET") {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < ttl) return hit.data as T;
  } else {
    // Any write may change balances/lists; the cache is short-lived anyway.
    cache.clear();
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, {
        method,
        headers: opts.body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      // List endpoints answer "No transfers found for this account" instead of [].
      if (!res.ok && opts.emptyList && res.status === 404) {
        if (canCache()) cache.set(cacheKey, { at: Date.now(), data: [] });
        return [] as T;
      }
      if (!res.ok) {
        if (res.status >= 500 && attempt < 2) throw new NessieError(res.status, text);
        throw Object.assign(new NessieError(res.status, `Nessie ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`), { final: true });
      }
      const data = (text ? JSON.parse(text) : null) as T;
      if (canCache()) cache.set(cacheKey, { at: Date.now(), data });
      return data;
    } catch (err) {
      lastErr = err;
      if ((err as { final?: boolean }).final) throw err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Some list endpoints return a bare array, others { data, paging }.
function unwrap<T>(res: T[] | { data: T[] }): T[] {
  return Array.isArray(res) ? res : (res?.data ?? []);
}

<<<<<<< HEAD
const today = () => isoDay();
const list = <T>(path: string, query?: Record<string, string | number | undefined>) => request<T[]>("GET", path, { query, emptyList: true });
=======
const today = () => new Date().toISOString().slice(0, 10);
// Financial lists must be fresh across API workers too; a process-local cache cannot see another worker's writes.
const list = <T>(path: string, query?: Record<string, string | number | undefined>) => request<T[]>("GET", path, { query, emptyList: true, ttlMs: 0 });
>>>>>>> 6ece23a5f974b1f0aa2c380d38efcb2e0913281f

export const nessie = {
  // Customers
  getCustomer: (id: string) => request<NessieCustomer>("GET", `/customers/${id}`),
  createCustomer: (body: Omit<NessieCustomer, "_id">) =>
    request<NessieCreateResponse<NessieCustomer>>("POST", "/customers", { body }).then((r) => r.objectCreated),

  // Accounts. `balance` is fixed at creation (updates accept nickname only) — use services/ledger.ts for live balances.
  getAccount: (id: string) => request<NessieAccount>("GET", `/accounts/${id}`),
  getCustomerAccounts: (customerId: string) => list<NessieAccount>(`/customers/${customerId}/accounts`),
  createAccount: (customerId: string, body: { type: NessieAccountType; nickname: string; rewards: number; balance: number }) =>
    request<NessieCreateResponse<NessieAccount>>("POST", `/customers/${customerId}/accounts`, { body }).then((r) => r.objectCreated),

  // Purchases
  getPurchases: (accountId: string) => list<NessiePurchase>(`/accounts/${accountId}/purchases`),
  createPurchase: (accountId: string, body: { merchant_id: string; medium?: "balance"; purchase_date?: string; amount: number; status?: string; description?: string }) =>
    request<NessieCreateResponse<NessiePurchase>>("POST", `/accounts/${accountId}/purchases`, {
      body: { medium: "balance", purchase_date: today(), status: "completed", ...body },
    }).then((r) => r.objectCreated),

  // Transfers are intentionally not used: this Nessie build accepts no payee and never moves balances.
  // Money movement between accounts = withdrawal on source + deposit on destination (services/ledger.ts).

  // Deposits / withdrawals
  getDeposits: (accountId: string) => list<NessieDeposit>(`/accounts/${accountId}/deposits`),
  createDeposit: (accountId: string, body: { amount: number; description: string; transaction_date?: string }) =>
    request<NessieCreateResponse<NessieDeposit>>("POST", `/accounts/${accountId}/deposits`, {
      body: { medium: "balance", transaction_date: today(), status: "completed", ...body },
    }).then((r) => r.objectCreated),
  getWithdrawals: (accountId: string) => list<NessieWithdrawal>(`/accounts/${accountId}/withdrawals`),
  createWithdrawal: (accountId: string, body: { amount: number; description: string; transaction_date?: string }) =>
    request<NessieCreateResponse<NessieWithdrawal>>("POST", `/accounts/${accountId}/withdrawals`, {
      body: { medium: "balance", transaction_date: today(), status: "completed", ...body },
    }).then((r) => r.objectCreated),

  // Merchants (cached longer; they rarely change)
  getMerchant: (id: string) => request<NessieMerchant>("GET", `/merchants/${id}`, { ttlMs: 60 * 60_000 }),
  createMerchant: (body: Omit<NessieMerchant, "_id">) =>
    request<NessieCreateResponse<NessieMerchant>>("POST", "/merchants", { body }).then((r) => r.objectCreated),

  // Bills
  getCustomerBills: (customerId: string) => list<NessieBill>(`/customers/${customerId}/bills`),
  getAccountBills: (accountId: string) => list<NessieBill>(`/accounts/${accountId}/bills`),
  createBill: (accountId: string, body: Pick<NessieBill, "status" | "payee" | "payment_amount"> & Partial<Pick<NessieBill, "nickname" | "payment_date" | "recurring_date">>) =>
    request<NessieCreateResponse<NessieBill>>("POST", `/accounts/${accountId}/bills`, { body }).then((r) => r.objectCreated),
  updateBill: (billId: string, body: Partial<Omit<NessieBill, "_id" | "account_id">>) => request<unknown>("PUT", `/bills/${billId}`, { body }),

  // ATMs: the geo filter is ignored by Nessie and all data is DC-area, so callers sort by distance themselves.
  getAllAtms: async () => unwrap(await request<NessieAtm[] | { data: NessieAtm[] }>("GET", "/atms", { ttlMs: 60 * 60_000 })),
};

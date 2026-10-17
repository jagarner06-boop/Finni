import { ID_TOKEN_HEADER, STEP_UP_REQUIRED, type ApiErrorBody } from '@finni/shared';

import { authBridge } from '@/auth/authBridge';
import { config } from '@/config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }

  get isStepUpRequired() {
    return this.status === 403 && this.code === STEP_UP_REQUIRED;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Skip the bearer token (e.g. /health). */
  anonymous?: boolean;
  /** Attach the Auth0 ID token (approvals: proves a recent re-login for step-up). */
  withIdToken?: boolean;
  /** 'auto' runs the step-up on a 403 step_up_required and retries; 'none' throws it to the caller. */
  stepUp?: 'auto' | 'none';
  signal?: AbortSignal;
}

const TIMEOUT_MS = 30_000; // Gemini tool loops can be slow

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${config.apiUrl}${path}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

async function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.withIdToken) {
    const idToken = await authBridge.getIdToken();
    if (idToken) headers[ID_TOKEN_HEADER] = idToken;
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => timeout.abort());
  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: timeout.signal,
    });
  } catch (e) {
    const aborted = timeout.signal.aborted && !opts.signal?.aborted;
    throw new ApiError(0, aborted ? 'timeout' : 'network_error', (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

async function toError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, body.error ?? `http_${res.status}`, body.message);
}

/**
 * Authenticated JSON fetch against the Finni API.
 * - 401 → session is dropped (back to Welcome) and an ApiError is thrown.
 * - 403 step_up_required → runs step-up once, then retries with the new token (unless `stepUp: 'none'`).
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let token: string | null = null;
  if (!opts.anonymous) {
    token = await authBridge.getAccessToken();
    if (!token) {
      authBridge.onUnauthorized();
      throw new ApiError(401, 'unauthorized');
    }
  }

  let res = await send(path, opts, token);

  if (res.status === 403) {
    const err = await toError(res);
    if (!err.isStepUpRequired || opts.stepUp === 'none') throw err;
    const stepped = await authBridge.stepUp();
    if (!stepped) throw err; // user cancelled MFA
    res = await send(path, opts, stepped);
  }

  if (res.status === 401 && !opts.anonymous) {
    authBridge.onUnauthorized();
    throw await toError(res);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

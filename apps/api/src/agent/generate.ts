const MAX_RETRY_WAIT_S = 15;
const MAX_ATTEMPTS = 3;

const statusOf = (err: unknown) => (err as { status?: number }).status ?? 0;
const retryable = (err: unknown) => statusOf(err) === 429 || statusOf(err) >= 500;

export interface GenerationFailure {
  model: string;
  attempt: number;
  status: number;
  next: 'retry' | 'fallback' | 'stop';
}

/** At most three calls. A 503 switches models immediately, leaving a retry for the fallback. */
export async function generateWithFallback<T>(
  call: (model: string) => Promise<T>,
  models: { primary: string; fallback: string },
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  onFailure: (failure: GenerationFailure) => void = () => {},
): Promise<T> {
  const choices = [...new Set([models.primary, models.fallback])];
  let attempts = 0;
  let lastError: unknown;
  for (let index = 0; index < choices.length; index++) {
    const model = choices[index];
    const hasFallback = index + 1 < choices.length;
    for (let local = 0; local < 2 && attempts < MAX_ATTEMPTS; local++) {
      attempts++;
      try {
        return await call(model);
      } catch (err) {
        lastError = err;
        const status = statusOf(err);
        const message = (err as Error).message ?? '';
        const retryIn = Number(/retry in ([\d.]+)s/i.exec(message)?.[1] ?? 1.5);
        const again = retryable(err) && local === 0 && attempts < MAX_ATTEMPTS &&
          !(status === 503 && hasFallback) && retryIn <= MAX_RETRY_WAIT_S && !/PerDay/i.test(message);
        const next = again ? 'retry' : retryable(err) && hasFallback ? 'fallback' : 'stop';
        onFailure({ model, attempt: attempts, status, next });
        if (!retryable(err)) throw err;
        if (!again) break;
        await sleep(retryIn * 1000 + Math.random() * 250);
      }
    }
  }
  throw lastError;
}

const MAX_RETRY_WAIT_S = 15;

const statusOf = (err: unknown) => (err as { status?: number }).status ?? 0;
const retryable = (err: unknown) => statusOf(err) === 429 || statusOf(err) >= 500;

/**
 * Calls the primary model; on a 429/5xx retries it once (honoring "retry in Ns" up to 15s, but not for
 * daily quota), then tries the fallback model once. Other errors throw right away.
 */
export async function generateWithFallback<T>(
  call: (model: string) => Promise<T>,
  models: { primary: string; fallback: string },
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  try {
    return await call(models.primary);
  } catch (err) {
    if (!retryable(err)) throw err;
    const message = (err as Error).message ?? "";
    const retryIn = Number(/retry in ([\d.]+)s/i.exec(message)?.[1] ?? 1.5);
    if (retryIn <= MAX_RETRY_WAIT_S && !/PerDay/.test(message)) {
      await sleep(retryIn * 1000 + 250);
      try {
        return await call(models.primary);
      } catch (again) {
        if (!retryable(again)) throw again;
      }
    }
    if (models.fallback === models.primary) throw err;
    return call(models.fallback);
  }
}

// Auto-retry with exponential backoff. Use for flaky network calls
// (buffer fetches, edge functions) — NOT for idempotent-unsafe writes.

export interface RetryOptions {
  retries?: number;       // total attempts beyond the first (default 3)
  baseDelayMs?: number;   // initial delay (default 300ms)
  maxDelayMs?: number;    // cap (default 4000ms)
  factor?: number;        // backoff multiplier (default 2)
  jitter?: boolean;       // randomize delay (default true)
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  onRetry?: (err: unknown, attempt: number, delay: number) => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 4000,
    factor = 2,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = opts;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(err, attempt)) throw err;
      const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(factor, attempt - 1));
      const delay = jitter ? Math.round(exp * (0.5 + Math.random() * 0.5)) : exp;
      onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }
}

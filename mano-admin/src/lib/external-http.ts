export class ExternalProviderError extends Error {
  readonly provider: string;
  readonly operation: string;
  readonly status: number;
  readonly retryable: boolean;
  attempts: number;
  readonly retryAfterMs: number | null;
  constructor(
    message: string,
    provider: string,
    operation: string,
    status: number,
    retryable: boolean,
    attempts = 1,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "ExternalProviderError";
    this.provider = provider;
    this.operation = operation;
    this.status = status;
    this.retryable = retryable;
    this.attempts = attempts;
    this.retryAfterMs = retryAfterMs;
  }
}

export function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export function shouldRetryProviderStatus(status: number) {
  return status >= 500 && status < 600;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export async function retryExternal<T>(run: (attempt: number) => Promise<T>, options: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; sleep?: (ms: number) => Promise<unknown> } = {}) {
  const maxAttempts = options.maxAttempts ?? 3, base = options.baseDelayMs ?? 2000, cap = options.maxDelayMs ?? 20000, sleep = options.sleep ?? wait;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await run(attempt); }
    catch (error) {
      if (!(error instanceof ExternalProviderError) || !error.retryable || attempt >= maxAttempts) { if (error instanceof ExternalProviderError) error.attempts = attempt; throw error; }
      error.attempts = attempt;
      const delay = Math.min(error.retryAfterMs ?? base * 2 ** (attempt - 1), cap);
      await sleep(delay);
    }
  }
  throw new Error("External retry exhausted");
}

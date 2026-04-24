const MAX_FEED_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function fetchWithBackoff<T>(request: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_FEED_RETRIES; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_FEED_RETRIES) {
        break;
      }

      await wait(RETRY_DELAY_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

export function warnFeedFailureOnce(
  label: string,
  error: unknown,
  warnedRef: { current: boolean },
) {
  if (process.env.NODE_ENV !== "development" || warnedRef.current) {
    return;
  }

  warnedRef.current = true;
  console.warn(`${label} refresh failed`, error);
}

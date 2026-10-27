import { retryDelayMs } from "@disco/domain";

export type SendResult = { ok: true } | { ok: false; retryable: boolean };

export type UploadOutcome = { ok: true; attempts: number } | { ok: false; attempts: number };

/**
 * Runs an upload and retries it, waiting longer each time, while the failure may be
 * temporary (a weak connection). Stops at once on a failure retrying cannot fix.
 */
export async function uploadWithRetry(
  send: () => Promise<SendResult>,
  wait: (ms: number) => Promise<void>,
  onRetry?: (failures: number, delayMs: number) => void,
): Promise<UploadOutcome> {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    let result: SendResult;
    try {
      result = await send();
    } catch {
      result = { ok: false, retryable: true };
    }
    if (result.ok) {
      return { ok: true, attempts };
    }
    const delay = result.retryable ? retryDelayMs(attempts) : null;
    if (delay === null) {
      return { ok: false, attempts };
    }
    onRetry?.(attempts, delay);
    await wait(delay);
  }
}

/**
 * Simple offline mutation queue.
 *
 * Stores failed mutations in localStorage and replays them when the browser
 * comes back online. Best-effort — not guaranteed delivery.
 */

interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string | null;
  timestamp: number;
}

const QUEUE_KEY = "homebase-offline-queue";

function getQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage might be full — drop oldest entries and retry
    if (queue.length > 1) {
      saveQueue(queue.slice(Math.floor(queue.length / 2)));
    }
  }
}

/**
 * Queue a mutation for later replay. Call this when a fetch fails due to
 * being offline.
 */
export function queueMutation(
  url: string,
  method: string,
  body?: unknown,
): void {
  const queue = getQueue();
  queue.push({
    id: crypto.randomUUID(),
    url,
    method,
    body: body ? JSON.stringify(body) : null,
    timestamp: Date.now(),
  });
  saveQueue(queue);
  console.log(`[offline-queue] Queued ${method} ${url} (${queue.length} total)`);
}

/**
 * Replay all queued mutations. Removes successfully replayed mutations
 * from the queue.
 */
export async function replayQueue(): Promise<{
  replayed: number;
  failed: number;
}> {
  const queue = getQueue();
  if (queue.length === 0) return { replayed: 0, failed: 0 };

  console.log(`[offline-queue] Replaying ${queue.length} queued mutations`);

  const failed: QueuedMutation[] = [];
  let replayed = 0;

  for (const mutation of queue) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.body
          ? { "Content-Type": "application/json" }
          : undefined,
        body: mutation.body,
      });

      if (response.ok) {
        replayed++;
      } else if (response.status >= 500) {
        // Server error — keep for retry
        failed.push(mutation);
      } else {
        // Client error (4xx) — discard, retrying won't help
        replayed++;
        console.warn(
          `[offline-queue] Discarding ${mutation.method} ${mutation.url} — status ${response.status}`,
        );
      }
    } catch {
      // Still offline or network error — keep for later
      failed.push(mutation);
    }
  }

  saveQueue(failed);

  console.log(
    `[offline-queue] Replay complete: ${replayed} succeeded, ${failed.length} remaining`,
  );

  return { replayed, failed: failed.length };
}

/**
 * Set up automatic replay when the browser comes back online.
 * Call once at app initialization.
 */
export function setupOfflineSync(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    // Small delay to let the connection stabilize
    setTimeout(() => {
      replayQueue();
    }, 1000);
  });
}

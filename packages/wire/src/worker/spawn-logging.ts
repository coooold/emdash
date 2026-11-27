import type { WorkerProcess, WorkerProcessSpawner } from './types';

const WORKER_SPAWN_LOGGING_KIND = 'wire-worker-spawn-logging';

export type WorkerSpawnLogToggle = {
  kind: typeof WORKER_SPAWN_LOGGING_KIND;
  enabled: boolean;
};

export function workerSpawnLogToggle(enabled: boolean): WorkerSpawnLogToggle {
  return { kind: WORKER_SPAWN_LOGGING_KIND, enabled };
}

export function isWorkerSpawnLogToggle(message: unknown): message is WorkerSpawnLogToggle {
  return (
    typeof message === 'object' &&
    message !== null &&
    'kind' in message &&
    message.kind === WORKER_SPAWN_LOGGING_KIND &&
    'enabled' in message &&
    typeof message.enabled === 'boolean'
  );
}

export function createSpawnLoggingSpawner(
  inner: WorkerProcessSpawner
): WorkerProcessSpawner & { setSpawnLogging(enabled: boolean): void } {
  const live = new Set<WorkerProcess>();
  let spawnLogging = false;

  return {
    async spawn(spec, scope) {
      const worker = await inner.spawn(spec, scope);
      live.add(worker);
      worker.onExit(() => {
        live.delete(worker);
      });
      if (spawnLogging) sendSpawnLogToggle(worker, true);
      return worker;
    },
    setSpawnLogging(enabled) {
      spawnLogging = enabled;
      for (const worker of live) sendSpawnLogToggle(worker, enabled);
    },
  };
}

function sendSpawnLogToggle(worker: WorkerProcess, enabled: boolean): void {
  try {
    worker.send(workerSpawnLogToggle(enabled));
  } catch {
    // Workers can exit while the host is changing the logging setting.
  }
}

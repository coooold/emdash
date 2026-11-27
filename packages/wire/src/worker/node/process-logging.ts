import type { Logger } from '@ply/shared/logger';
import { initProcessLogging } from '@ply/shared/logger/node';
import { setVerboseSpawnLogging, startDevPerfInstruments } from '@ply/shared/perf';
import { isWorkerSpawnLogToggle } from '../spawn-logging';
import { WORKER_NAME_ENV_VAR } from '../types';

export function initWorkerProcessLogging(fallbackName: string): Logger {
  const logger = initProcessLogging({
    name: process.env[WORKER_NAME_ENV_VAR] ?? fallbackName,
  });
  // Dev-only spawn/RSS reporting; a no-op unless debug logging is enabled.
  startDevPerfInstruments({ logger });
  if (typeof process.send === 'function') {
    process.on('message', (message) => {
      if (isWorkerSpawnLogToggle(message)) setVerboseSpawnLogging(logger, message.enabled);
    });
  }
  return logger;
}

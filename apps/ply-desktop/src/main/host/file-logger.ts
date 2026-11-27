import { join, resolve } from 'node:path';
import { serializeLogValue, stringifyLogValue } from '@ply/shared/logger';
import { createFileTransport } from '@ply/shared/logger/node';
import { app } from 'electron';
import type pinoLib from 'pino';

const MAX_LOG_BYTES = 5 * 1024 * 1024;
const RETAINED_LOG_FILES = 5;
const LOG_FILE_NAME = 'emdash.log';
const RENDERER_LOG_PAYLOAD_LIMIT = 64 * 1024;
const PROCESS_EXIT_FLUSH_TIMEOUT_MS = 1000;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
let logFilePath: string | undefined;

export function initializeFileLogger() {
  const override = process.env.EMDASH_LOG_FILE?.trim();
  if (override) {
    logFilePath = resolve(override);
    return;
  }

  const electronApp = app as Electron.App | undefined;
  if (!electronApp?.setAppLogsPath) return;

  electronApp.setAppLogsPath(join(electronApp.getPath('userData'), 'logs'));
  logFilePath = join(electronApp.getPath('logs'), LOG_FILE_NAME);
}

export function getLogFilePath(): string | undefined {
  return logFilePath;
}

function resolveLogPath(): string | undefined {
  if (!logFilePath) initializeFileLogger();
  return logFilePath;
}

/**
 * Singleton file transport — shared between the pino destination and the
 * renderer log intake so there is exactly one serialized write queue.
 * The transport applies `redactAll` to every line by default; no explicit
 * redact wiring is needed here.
 */
const sharedTransport = createFileTransport({
  path: resolveLogPath,
  maxBytes: MAX_LOG_BYTES,
  retainedFiles: RETAINED_LOG_FILES,
});

/**
 * Returns a pino-compatible DestinationStream backed by the shared transport.
 * Called once at main-process logger construction.
 */
export function getLogFileDestination(): pinoLib.DestinationStream {
  return sharedTransport.asDestination();
}

export function flushLogWrites(): Promise<void> {
  return sharedTransport.flush();
}

export function registerProcessErrorLogging(logger: { error(...input: unknown[]): void }) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    flushAndExit();
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
    flushAndExit();
  });
}

function flushAndExit() {
  const flush = Promise.race([
    flushLogWrites(),
    new Promise<void>((resolve) => setTimeout(resolve, PROCESS_EXIT_FLUSH_TIMEOUT_MS)),
  ]);
  void flush.finally(() => process.exit(1));
}

export function writeRendererLogEntry(entry: {
  level: LogLevel;
  source: 'renderer';
  input: unknown[];
}) {
  if (!isWithinPayloadLimit(entry)) return;
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: entry.level,
    source: entry.source,
    message: entry.input.map((v) => (typeof v === 'string' ? v : stringifyLogValue(v))).join(' '),
    data: entry.input.map(serializeLogValue),
  });

  sharedTransport.write(payload);
}

function isWithinPayloadLimit(payload: unknown): boolean {
  try {
    return JSON.stringify(payload).length <= RENDERER_LOG_PAYLOAD_LIMIT;
  } catch {
    return false;
  }
}

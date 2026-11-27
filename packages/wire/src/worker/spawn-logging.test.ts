import type { Scope } from '@ply/shared/concurrency';
import { describe, expect, it } from 'vitest';
import { createSpawnLoggingSpawner, workerSpawnLogToggle } from './spawn-logging';
import type { ProcessExit, WorkerProcess, WorkerProcessSpawner } from './types';

function fakeWorkerProcess(): WorkerProcess & {
  sent: unknown[];
  emitExit(): void;
} {
  const sent: unknown[] = [];
  const exitHandlers: Array<(exit: ProcessExit) => void> = [];
  return {
    pid: 123,
    sent,
    send(message) {
      sent.push(message);
    },
    onMessage() {
      return () => {};
    },
    onExit(cb) {
      exitHandlers.push(cb);
      return () => {};
    },
    onStdio() {
      return () => {};
    },
    kill() {},
    emitExit() {
      for (const handler of exitHandlers) handler({ code: 0, signal: null });
    },
  };
}

function fakeSpawner(processes: WorkerProcess[]): WorkerProcessSpawner {
  return {
    async spawn() {
      return processes.shift()!;
    },
  };
}

const scope = {} as Scope;

const spec = { entry: '/tmp/worker.js' };

describe('createSpawnLoggingSpawner', () => {
  it('broadcasts spawn-log toggles to live and future workers', async () => {
    const first = fakeWorkerProcess();
    const second = fakeWorkerProcess();
    const spawner = createSpawnLoggingSpawner(fakeSpawner([first, second]));

    await spawner.spawn(spec, scope);
    spawner.setSpawnLogging(true);
    expect(first.sent).toEqual([workerSpawnLogToggle(true)]);

    await spawner.spawn(spec, scope);
    expect(second.sent).toEqual([workerSpawnLogToggle(true)]);

    spawner.setSpawnLogging(false);
    expect(first.sent[1]).toEqual(workerSpawnLogToggle(false));
    first.emitExit();
    spawner.setSpawnLogging(true);
    expect(first.sent).toHaveLength(2);
    expect(second.sent).toEqual([
      workerSpawnLogToggle(true),
      workerSpawnLogToggle(false),
      workerSpawnLogToggle(true),
    ]);
  });
});

import { LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import {
  GIT_DEPENDENCY_DESCRIPTOR,
  hostDependenciesContract,
  NODE_DEPENDENCY_DESCRIPTOR,
  type HostDependencyDefinition,
  type HostDependencySnapshot,
  type HostDependencyView,
} from '@ply/core/services/host-dependencies/node';
import { runtimeHostUnavailable } from '@ply/core/services/runtime-broker/api';
import { err, ok } from '@ply/shared';
import { deferred } from '@ply/shared/testing';
import { createLiveJobReplicaCache, LiveJobCancelledError } from '@ply/wire/live';
import { encodeTopic, type LiveSource } from '@ply/wire/rpc';
import { createTestWire } from '@ply/wire/testing';
import { describe, expect, it, vi } from 'vitest';
import { machinesContract, type InstallMachineSystemDependenciesInput } from '../api';
import { createMachinesWireController } from './wire-controller';

const runRuntimeLiveJob = vi.hoisted(() => vi.fn());

vi.mock('@core/services/runtime-clients/node/live-job', () => ({
  runRuntimeLiveJob,
}));

describe('createMachinesWireController system dependencies', () => {
  it('forwards the raw dependency snapshot state for a machine runtime', async () => {
    const agentView = hostDependencyView({
      id: 'fake-agent',
      name: 'Fake Agent',
      category: 'agent',
      binaryNames: ['fake-agent'],
      status: 'active',
    });
    const snapshot = hostDependencySnapshot([
      hostDependencyView(GIT_DEPENDENCY_DESCRIPTOR, { resolvedPath: '/usr/bin/git' }),
      hostDependencyView(NODE_DEPENDENCY_DESCRIPTOR),
      agentView,
    ]);
    const source = liveSource(snapshot);
    const state = vi.fn(() => ({ asLiveSource: () => source }));
    const mutate = vi.fn();
    const client = vi.fn(async () =>
      ok({
        hostDependencies: {
          snapshot: {
            state,
            mutate,
          },
        },
      })
    );
    const controller = createMachinesWireController({ client } as never);
    const topic = encodeTopic(machinesContract.systemDependencies.states.current.id, {});
    const lease = controller.acquireLive(topic);

    await expect(lease?.ready()).resolves.toBe(source);
    expect(client).toHaveBeenCalledWith(LOCAL_HOST_REF);
    expect(state).toHaveBeenCalledWith(undefined, 'current');
    expect(mutate).not.toHaveBeenCalled();

    await lease?.release();
  });

  it('forwards refresh mutations and rebinds their cursors', async () => {
    const snapshot = hostDependencySnapshot([
      hostDependencyView(GIT_DEPENDENCY_DESCRIPTOR, { resolvedPath: '/usr/bin/git' }),
    ]);
    const mutate = vi.fn(async () =>
      ok({
        data: snapshot,
        cursors: [
          {
            model: hostDependenciesContract.snapshot.states.current.id,
            key: undefined,
            cursor: { generation: 1, sequence: 2 },
          },
        ],
      })
    );
    const client = vi.fn(async () => ok({ hostDependencies: { snapshot: { mutate } } }));
    const controller = createMachinesWireController({ client } as never);
    const key = {};

    await expect(
      controller.call('systemDependencies.refresh', {
        key,
        input: undefined,
        mutationId: 'refresh-1',
      })
    ).resolves.toEqual(
      ok({
        data: snapshot,
        cursors: [
          {
            model: machinesContract.systemDependencies.states.current.id,
            key,
            cursor: { generation: 1, sequence: 2 },
          },
        ],
      })
    );
    expect(client).toHaveBeenCalledWith(LOCAL_HOST_REF);
    expect(mutate).toHaveBeenCalledWith('refresh', {
      key: undefined,
      input: {},
      mutationId: 'refresh-1',
    });
  });

  it('installs a classified system dependency through the machine runtime batch job', async () => {
    const view = hostDependencyView(GIT_DEPENDENCY_DESCRIPTOR, { resolvedPath: '/usr/bin/git' });
    runRuntimeLiveJob.mockResolvedValueOnce(ok({ git: ok(view) }));
    const runInstallBatch = {};
    const client = vi.fn(async () => ok({ hostDependencies: { runInstallBatch } }));
    const controller = createMachinesWireController({ client } as never);

    await expect(
      runInstallJob(controller, {
        dependencies: [{ id: 'git', method: 'homebrew' }],
      })
    ).resolves.toEqual({
      git: ok({
        id: 'git',
        name: 'Git',
        tier: 'required',
        status: 'available',
        path: '/usr/bin/git',
        installDocs: 'https://git-scm.com/downloads',
        installOptions: GIT_DEPENDENCY_DESCRIPTOR.installCommands?.macos ?? [],
      }),
    });
    expect(runRuntimeLiveJob).toHaveBeenCalledWith(
      expect.anything(),
      runInstallBatch,
      { requests: [{ id: 'git', method: 'homebrew' }] },
      expect.any(Function),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('rejects non-system dependency installation ids', async () => {
    const client = vi.fn(async () => ok({ hostDependencies: { runInstallBatch: {} } }));
    const controller = createMachinesWireController({ client } as never);

    await expect(
      runInstallJob(controller, {
        dependencies: [{ id: 'fake-agent' }],
      })
    ).resolves.toEqual({
      'fake-agent': err({ type: 'unknown-dependency', id: 'fake-agent' }),
    });
    expect(client).not.toHaveBeenCalled();
  });

  it('maps batched install results per system dependency', async () => {
    const gitView = hostDependencyView(GIT_DEPENDENCY_DESCRIPTOR, {
      resolvedPath: '/usr/bin/git',
    });
    runRuntimeLiveJob.mockResolvedValueOnce(
      ok({
        git: ok(gitView),
        node: err({
          type: 'command-failed',
          message: 'apt failed',
          output: 'lock timeout',
          exitCode: 100,
        }),
      })
    );
    const runInstallBatch = {};
    const client = vi.fn(async () => ok({ hostDependencies: { runInstallBatch } }));
    const controller = createMachinesWireController({ client } as never);

    await expect(
      runInstallJob(controller, {
        dependencies: [{ id: 'git' }, { id: 'node', method: 'apt' }],
      })
    ).resolves.toEqual({
      git: ok({
        id: 'git',
        name: 'Git',
        tier: 'required',
        status: 'available',
        path: '/usr/bin/git',
        installDocs: 'https://git-scm.com/downloads',
        installOptions: GIT_DEPENDENCY_DESCRIPTOR.installCommands?.macos ?? [],
      }),
      node: err({
        type: 'command-failed',
        message: 'apt failed',
        output: 'lock timeout',
        exitCode: 100,
      }),
    });
    expect(runRuntimeLiveJob).toHaveBeenCalledWith(
      expect.anything(),
      runInstallBatch,
      { requests: [{ id: 'git' }, { id: 'node', method: 'apt' }] },
      expect.any(Function),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('forwards live job cancellation to the runtime batch job', async () => {
    const receivedSignal = deferred<AbortSignal>();
    runRuntimeLiveJob.mockImplementationOnce(
      async (_definition, _handle, _input, _progress, options: { signal: AbortSignal }) => {
        receivedSignal.resolve(options.signal);
        await new Promise<void>((resolve) =>
          options.signal.addEventListener('abort', () => resolve(), { once: true })
        );
        return err({ type: 'io', message: 'cancelled' });
      }
    );
    const client = vi.fn(async () => ok({ hostDependencies: { runInstallBatch: {} } }));
    const controller = createMachinesWireController({ client } as never);
    const wire = createTestWire(machinesContract, controller);
    const jobs = createLiveJobReplicaCache(
      machinesContract.installSystemDependencies,
      wire.client.installSystemDependencies
    );
    const lease = await jobs.start({ dependencies: [{ id: 'git' }] });
    const job = await lease.ready();
    const signal = await receivedSignal.promise;

    await job.cancel();

    expect(signal.aborted).toBe(true);
    await expect(job.result).rejects.toBeInstanceOf(LiveJobCancelledError);
    await lease.release();
    await jobs.dispose();
    await wire.dispose();
  });

  it('throws runtime resolve errors for unavailable machine runtimes', async () => {
    const runtimeError = runtimeHostUnavailable(LOCAL_HOST_REF, 'unavailable');
    const controller = createMachinesWireController({
      client: async () => err(runtimeError),
    } as never);

    const topic = encodeTopic(machinesContract.systemDependencies.states.current.id, {});
    const lease = controller.acquireLive(topic);

    await expect(lease?.ready()).rejects.toThrow('unavailable');
    await lease?.release();
  });

  it('lists no remote machines and rejects remote operations without contacting workers', async () => {
    const client = vi.fn();
    const controller = createMachinesWireController({ client } as never);
    const wire = createTestWire(machinesContract, controller);
    try {
      await expect(wire.client.getMachines()).resolves.toEqual([]);
      await expect(wire.client.getMachineMetrics({ machineId: 'saved-ssh-host' })).rejects.toThrow(
        '此版本仅支持本地开发。'
      );
      await expect(wire.client.deleteMachine({ id: 'saved-ssh-host' })).rejects.toThrow(
        '此版本仅支持本地开发。'
      );
      expect(client).not.toHaveBeenCalled();
    } finally {
      await wire.dispose();
    }
  });
});

function hostDependencySnapshot(views: HostDependencyView[]): HostDependencySnapshot {
  return {
    hostId: 'test-host',
    generation: 1,
    hostElevation: null,
    dependencies: Object.fromEntries(views.map((view) => [view.definition.id, view])),
  };
}

function hostDependencyView(
  definition: HostDependencyDefinition,
  options: {
    resolvedPath?: string | null;
    status?: HostDependencyView['status'];
  } = {}
): HostDependencyView {
  const resolvedPath = options.resolvedPath ?? null;
  return {
    hostId: 'test-host',
    definition,
    installOptions: definition.installCommands?.macos ?? [],
    selection: null,
    candidates: [],
    resolved: resolvedPath
      ? {
          id: definition.id,
          command: definition.binaryNames[0] ?? definition.id,
          path: resolvedPath,
          realpath: resolvedPath,
          source: { kind: 'auto' },
        }
      : null,
    status: options.status ?? (resolvedPath ? 'available' : 'missing'),
    checkedAt: 1,
  };
}

async function runInstallJob(
  controller: ReturnType<typeof createMachinesWireController>,
  input: InstallMachineSystemDependenciesInput
) {
  const wire = createTestWire(machinesContract, controller);
  const jobs = createLiveJobReplicaCache(
    machinesContract.installSystemDependencies,
    wire.client.installSystemDependencies
  );
  const lease = await jobs.start(input);
  try {
    const job = await lease.ready();
    return await job.result;
  } finally {
    await lease.release();
    await jobs.dispose();
    await wire.dispose();
  }
}

function liveSource(data: unknown): LiveSource {
  return {
    snapshot: async () => ({ generation: 1, sequence: 0, timestamp: 0, data }),
    subscribe: () => () => {},
  };
}

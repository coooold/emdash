import { hostRef, LOCAL_HOST_REF } from '@emdash/core/primitives/host/api';
import { hostDependenciesContract } from '@emdash/core/services/host-dependencies/node';
import {
  runtimeHostNotConfigured,
  runtimeResolveErrorAsError,
  type RuntimeBroker,
  type HostRuntimesClient,
} from '@emdash/core/services/runtime-broker/api';
import { err, ok } from '@emdash/shared';
import { createController, type Controller, type LiveModelProvider } from '@emdash/wire/rpc';
import { forwardLiveModel } from '@core/services/runtime-clients/node/forward-live-model';
import { runRuntimeLiveJob } from '@core/services/runtime-clients/node/live-job';
import type { InstallMachineSystemDependenciesResult } from '../api';
import { machinesContract } from '../api';
import { mapSystemDependencyView, systemDependencyIds } from '../api/system-dependencies';

export function createMachinesWireController(runtimes: RuntimeBroker): Controller {
  const unavailable = (): never => {
    throw new Error('此版本仅支持本地开发。');
  };
  return createController(machinesContract, {
    getMachines: () => [],
    getMachineUsage: () => ({}),
    getMachineMetrics: async ({ machineId }) => {
      const runtime = await resolveMachineRuntime(runtimes, machineId);
      const sample = await runtime.resourceUsage.sample(undefined);
      if (!sample.success) throw new Error(sample.error.message);
      return sample.data;
    },
    systemDependencies: createSystemDependenciesModelProvider(runtimes),
    installSystemDependencies: {
      run: async ({ machineId, dependencies }, context) => {
        const mapped: InstallMachineSystemDependenciesResult = {};
        const requests = dependencies.filter(({ id }) => {
          if (systemDependencyIds.has(id)) return true;
          mapped[id] = err({ type: 'unknown-dependency', id });
          return false;
        });
        if (requests.length === 0) return ok(mapped);

        const runtime = await resolveMachineRuntime(runtimes, machineId);
        const result = await runRuntimeLiveJob(
          hostDependenciesContract.runInstallBatch,
          runtime.hostDependencies.runInstallBatch,
          { requests },
          context.progress,
          { signal: context.signal }
        );
        if (!result.success) {
          for (const { id } of requests) mapped[id] = err(result.error);
          return ok(mapped);
        }
        for (const { id } of requests) {
          const entry = result.data[id];
          mapped[id] = !entry
            ? err({ type: 'io', message: `Install result missing for dependency: ${id}` })
            : entry.success
              ? ok(mapSystemDependencyView(entry.data))
              : err(entry.error);
        }
        return ok(mapped);
      },
      toError: (error) => ({
        type: 'io',
        message: error instanceof Error ? error.message : String(error),
      }),
    },
    hostSettings: forwardLiveModel(machinesContract.hostSettings, async (key, name) => {
      const runtime = await resolveMachineRuntime(runtimes, key.machineId);
      // The upstream live model is itself named `state` on the host-settings contract.
      return runtime.hostSettings.state.state(undefined, name).asLiveSource();
    }),
    updateHostSettings: async ({ machineId, patch }) => {
      const runtime = await resolveMachineRuntime(runtimes, machineId);
      return runtime.hostSettings.update(patch);
    },
    saveMachine: unavailable,
    setSyncLocalSettings: unavailable,
    deleteMachine: unavailable,
    renameMachine: unavailable,
  });
}

function createSystemDependenciesModelProvider(
  runtimes: RuntimeBroker
): LiveModelProvider<typeof machinesContract.systemDependencies> {
  const contract = machinesContract.systemDependencies;
  const sourceStateId = hostDependenciesContract.snapshot.states.current.id;
  const targetStateId = contract.states.current.id;

  return {
    kind: 'liveModelProvider',
    contract,
    resolveState: async (key, name) => {
      const runtime = await resolveMachineRuntime(runtimes, key.machineId);
      return runtime.hostDependencies.snapshot.state(undefined, name).asLiveSource();
    },
    async runMutation(_name, envelope) {
      const runtime = await resolveMachineRuntime(runtimes, envelope.key.machineId);
      const result = await runtime.hostDependencies.snapshot.mutate('refresh', {
        ...envelope,
        key: undefined,
        input: {},
      });
      if (!result.success) {
        return result as Awaited<ReturnType<LiveModelProvider<typeof contract>['runMutation']>>;
      }
      return ok({
        ...result.data,
        cursors: result.data.cursors.map((cursor) => ({
          ...cursor,
          model: cursor.model === sourceStateId ? targetStateId : cursor.model,
          key: envelope.key,
        })),
      }) as Awaited<ReturnType<LiveModelProvider<typeof contract>['runMutation']>>;
    },
  };
}

async function resolveMachineRuntime(
  runtimes: RuntimeBroker,
  machineId?: string
): Promise<HostRuntimesClient> {
  if (machineId) {
    throw runtimeResolveErrorAsError(
      runtimeHostNotConfigured(hostRef('remote', machineId), '此版本仅支持本地开发。')
    );
  }
  const runtime = await runtimes.client(LOCAL_HOST_REF);
  if (!runtime.success) throw runtimeResolveErrorAsError(runtime.error);
  return runtime.data;
}

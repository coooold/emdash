import { mkdir } from 'node:fs/promises';
import { createJsonFileKeyValueStore } from '@ply/core/primitives/kv/node';
import type { AcpApiContract } from '@ply/core/runtimes/acp/api';
import { acpWorkerSpec } from '@ply/core/runtimes/acp/node';
import type { AgentConfigContract } from '@ply/core/runtimes/agent-config/api';
import { agentConfigWorkerSpec } from '@ply/core/runtimes/agent-config/node';
import type { AutomationsContract } from '@ply/core/runtimes/automations/api';
import { workspaceCreationAdmissionContract } from '@ply/core/runtimes/automations/api';
import { automationsWorkerSpec } from '@ply/core/runtimes/automations/node';
import type { ConversationsContract } from '@ply/core/runtimes/conversations/api';
import { conversationsWorkerSpec } from '@ply/core/runtimes/conversations/node';
import type { FileSearchContract } from '@ply/core/runtimes/file-search/api';
import { fileSearchWorkerSpec } from '@ply/core/runtimes/file-search/node';
import type { FilesContract } from '@ply/core/runtimes/files/api';
import { filesWorkerSpec } from '@ply/core/runtimes/files/node';
import type { GitContract } from '@ply/core/runtimes/git/api';
import { gitWorkerSpec } from '@ply/core/runtimes/git/node';
import type { HostSettingsContract } from '@ply/core/runtimes/host-settings/api';
import { hostSettingsWorkerSpec } from '@ply/core/runtimes/host-settings/node';
import { lspContract, type LspContract } from '@ply/core/runtimes/lsp/api';
import { lspWorkerSpec } from '@ply/core/runtimes/lsp/node';
import {
  providerUsageContract,
  type ProviderUsageContract,
} from '@ply/core/runtimes/provider-usage/api';
import { providerUsageWorkerSpec } from '@ply/core/runtimes/provider-usage/node';
import type { ResourceUsageContract } from '@ply/core/runtimes/resource-usage/api';
import { resourceUsageWorkerSpec } from '@ply/core/runtimes/resource-usage/node';
import type { ScriptsContract } from '@ply/core/runtimes/scripts/api';
import { scriptsWorkerSpec } from '@ply/core/runtimes/scripts/node';
import type { TerminalsContract } from '@ply/core/runtimes/terminals/api';
import { terminalsWorkerSpec } from '@ply/core/runtimes/terminals/node';
import type { TuiAgentsContract } from '@ply/core/runtimes/tui-agents/api';
import { tuiAgentsWorkerSpec } from '@ply/core/runtimes/tui-agents/node';
import type { WorkspaceRegistryContract } from '@ply/core/runtimes/workspace-registry/api';
import { workspaceRegistryWorkerSpec } from '@ply/core/runtimes/workspace-registry/node';
import { buildDescriptorFromProvider } from '@ply/core/services/agent-plugins/api/plugins';
import { NodeExecutionContext } from '@ply/core/services/exec/api';
import { fsWatchWorkerSpec } from '@ply/core/services/fs-watch/node';
import { gitCredentialChannelsContract } from '@ply/core/services/git-credential-channels/api';
import {
  CORE_DEPENDENCIES,
  createHostDependenciesComponent,
  type HostDependenciesContract,
} from '@ply/core/services/host-dependencies/node';
import {
  createUserShellEnvController,
  type ShellEnvManager,
} from '@ply/core/services/shell-env/node';
import { pluginRegistry } from '@ply/plugins/agents';
import { ok } from '@ply/shared';
import type { Scope } from '@ply/shared/concurrency';
import type { Logger } from '@ply/shared/logger';
import { createController, queuedClient, type ContractClient } from '@ply/wire/rpc';
import { createWireWorkerHost } from '@ply/wire/worker';
import { childProcessSpawner } from '@ply/wire/worker/node';
import { workspaceServerRuntimePaths } from '../runtime/paths';
import { workspaceWorkerPath } from './worker-paths';

export type WorkspaceServerRuntimeClients = {
  acp: ContractClient<AcpApiContract>;
  agentConfig: ContractClient<AgentConfigContract>;
  providerUsage: ContractClient<ProviderUsageContract>;
  automations: ContractClient<AutomationsContract>;
  conversations: ContractClient<ConversationsContract>;
  fileSearch: ContractClient<FileSearchContract>;
  files: ContractClient<FilesContract>;
  lsp: ContractClient<LspContract>;
  git: ContractClient<GitContract>;
  hostSettings: ContractClient<HostSettingsContract>;
  resourceUsage: ContractClient<ResourceUsageContract>;
  scripts: ContractClient<ScriptsContract>;
  terminals: ContractClient<TerminalsContract>;
  tuiAgents: ContractClient<TuiAgentsContract>;
  workspaceRegistry: ContractClient<WorkspaceRegistryContract>;
};

export type WorkspaceServerRuntimeHost = {
  runtimes: WorkspaceServerRuntimeClients;
  hostDependencies: ContractClient<HostDependenciesContract>;
};

export type CreateWorkspaceServerRuntimeHostOptions = {
  scope: Scope;
  socketPath?: string;
  shellEnv: ShellEnvManager;
  logger?: Logger;
};

const DETACHED_TERMINAL_GRACE_MS = 5 * 60_000;

export async function createWorkspaceServerRuntimeHost(
  options: CreateWorkspaceServerRuntimeHostOptions
): Promise<WorkspaceServerRuntimeHost> {
  const env = options.shellEnv.env;
  const userShellEnv = createUserShellEnvController(() => options.shellEnv.current());
  // Git credential channels are minted on the desktop loopback, which remote sessions
  // cannot reach, so sessions here never receive one to release.
  const gitCredentialChannels = createController(gitCredentialChannelsContract, {
    release: async () => {},
  });
  const paths = workspaceServerRuntimePaths(options.socketPath);
  await Promise.all([
    mkdir(paths.stateDirectory, { recursive: true }),
    mkdir(paths.attachmentsDirectory, { recursive: true }),
  ]);

  const workerHost = createWireWorkerHost({
    scope: options.scope.child('workers'),
    processSpawner: childProcessSpawner(),
  });
  const hostDependencies = createHostDependenciesComponent({
    store: createJsonFileKeyValueStore({ path: paths.hostDependenciesStore }),
    exec: new NodeExecutionContext({ env, refreshShellEnv: () => options.shellEnv.refresh() }),
    logger: options.logger,
  }).create({
    scope: options.scope.child('host-dependencies'),
    dependencies: {},
    config: {
      hostId: 'local',
      definitions: [
        ...CORE_DEPENDENCIES,
        ...pluginRegistry.getAll().map(buildDescriptorFromProvider),
      ],
    },
  });

  const conversationsPromise = workerHost.spawn(
    ...conversationsWorkerSpec({
      executable: workspaceWorkerPath('conversations'),
      env,
      databasePath: paths.conversationsDatabase,
      attachmentsDir: paths.attachmentsDirectory,
    })
  );
  const watcherPromise = workerHost.spawn(
    ...fsWatchWorkerSpec({ executable: workspaceWorkerPath('fs-watch'), env })
  );
  const terminalsPromise = workerHost.spawn(
    ...terminalsWorkerSpec({
      executable: workspaceWorkerPath('terminals'),
      env,
      userEnv: userShellEnv,
      gitCredentialChannels,
      lifecycle: {
        terminal: { kind: 'while-attached', graceMs: DETACHED_TERMINAL_GRACE_MS },
      },
    })
  );
  const lspWorker = workerHost.create(
    ...lspWorkerSpec({
      executable: workspaceWorkerPath('lsp'),
      env,
      dependencies: { userEnv: userShellEnv, hostDependencies: hostDependencies.client.resolver },
    })
  );
  const resourceUsagePromise = workerHost.spawn(
    ...resourceUsageWorkerSpec({
      executable: workspaceWorkerPath('resource-usage'),
      env,
    })
  );
  const hostSettingsPromise = workerHost.spawn(
    ...hostSettingsWorkerSpec({
      executable: workspaceWorkerPath('host-settings'),
      env,
      settingsPath: paths.hostSettingsFile,
    })
  );
  const scriptsPromise = workerHost.spawn(
    ...scriptsWorkerSpec({
      executable: workspaceWorkerPath('scripts'),
      env,
      userEnv: userShellEnv,
    })
  );
  const acpPromise = conversationsPromise.then((conversations) =>
    workerHost.spawn(
      ...acpWorkerSpec({
        pluginRegistry,
        executable: workspaceWorkerPath('acp'),
        env,
        dependencies: {
          hostDependencies: hostDependencies.client.resolver,
          conversations,
          attachments: conversations,
          userEnv: userShellEnv,
        },
        intentsFilePath: paths.acpIntentsFile,
      })
    )
  );
  const agentConfigPromise = workerHost.spawn(
    ...agentConfigWorkerSpec({
      pluginRegistry,
      executable: workspaceWorkerPath('agent-config'),
      env,
      dependencies: {
        hostDependencies: hostDependencies.client.resolver,
        userEnv: userShellEnv,
      },
    })
  );
  const providerUsageWorker = workerHost.create(
    ...providerUsageWorkerSpec({
      pluginRegistry,
      executable: workspaceWorkerPath('provider-usage'),
      env,
      dependencies: {
        hostDependencies: hostDependencies.client.resolver,
        userEnv: userShellEnv,
      },
    })
  );
  const tuiAgentsPromise = conversationsPromise.then((conversations) =>
    workerHost.spawn(
      ...tuiAgentsWorkerSpec({
        pluginRegistry,
        executable: workspaceWorkerPath('tui-agents'),
        env,
        dependencies: {
          hostDependencies: hostDependencies.client.resolver,
          conversations,
          userEnv: userShellEnv,
          gitCredentialChannels,
        },
        intentsFilePath: paths.tuiAgentsIntentsFile,
      })
    )
  );

  const [
    conversations,
    watcher,
    terminals,
    resourceUsage,
    hostSettings,
    scripts,
    acp,
    agentConfig,
    tuiAgents,
  ] = await Promise.all([
    conversationsPromise,
    watcherPromise,
    terminalsPromise,
    resourceUsagePromise,
    hostSettingsPromise,
    scriptsPromise,
    acpPromise,
    agentConfigPromise,
    tuiAgentsPromise,
  ]);

  // Host-settings are already awaited above, so the per-host watcherExclude can
  // configure the files, git, and workspace-registry workers at spawn
  // (restart-applied). Unset leaves watchIgnore undefined and each runtime falls
  // back to the shared DEFAULT_WATCHER_EXCLUDE — defaults live in code, never in
  // the store. All three receive the same list so their working-tree watches
  // share one native subscription per root.
  const hostSettingsState = await hostSettings.get();
  const watchIgnore = hostSettingsState.success
    ? hostSettingsState.data.settings.watcherExclude
    : undefined;
  const filesPromise = workerHost.spawn(
    ...filesWorkerSpec({
      executable: workspaceWorkerPath('files'),
      env,
      dependencies: { watcher },
      watchIgnore,
    })
  );
  const fileSearchPromise = workerHost.spawn(
    ...fileSearchWorkerSpec({
      executable: workspaceWorkerPath('file-search'),
      env,
      dependencies: { watcher, userEnv: userShellEnv },
      databasePath: paths.fileSearchDatabase,
      ripgrepPath: env['EMDASH_WS_RIPGREP_PATH'],
    })
  );
  const gitPromise = workerHost.spawn(
    ...gitWorkerSpec({
      executable: workspaceWorkerPath('git'),
      env,
      dependencies: {
        watcher,
        hostDependencies: hostDependencies.client.resolver,
        userEnv: userShellEnv,
      },
      watchIgnore,
    })
  );
  const workspaceRegistryPromise = workerHost.spawn(
    ...workspaceRegistryWorkerSpec({
      executable: workspaceWorkerPath('workspace-registry'),
      env,
      dependencies: {
        watcher,
        acp,
        terminals,
        tuiAgents,
        scripts,
        hostSettings,
        userEnv: userShellEnv,
      },
      databasePath: paths.workspaceRegistryDatabase,
      attachmentsDir: paths.attachmentsDirectory,
      watchIgnore,
    })
  );

  const [files, fileSearch, git, workspaceRegistry] = await Promise.all([
    filesPromise,
    fileSearchPromise,
    gitPromise,
    workspaceRegistryPromise,
  ]);
  const automations = await workerHost.spawn(
    ...automationsWorkerSpec({
      executable: workspaceWorkerPath('automations'),
      env,
      dependencies: {
        workspaceRegistry,
        // Deletion tombstones are client-plane data (ADR 0006): the workspace server
        // has no desktop mirror to consult, so host-resident runs admit
        // unconditionally; identity-keyed sweeps keep recreation safe regardless.
        creationAdmission: createController(workspaceCreationAdmissionContract, {
          checkWorktreeCreation: async () => ok(undefined),
        }),
        acpSessions: acp,
        tuiSessions: tuiAgents,
        conversationIndex: conversations,
      },
      dbFile: paths.automationsDatabase,
    })
  );

  return {
    runtimes: {
      acp,
      agentConfig,
      providerUsage: queuedClient(providerUsageContract, () => providerUsageWorker.ready(), {
        retryReadinessOnFailure: true,
      }),
      automations,
      conversations,
      fileSearch,
      files,
      git,
      hostSettings,
      resourceUsage,
      lsp: queuedClient(lspContract, () => lspWorker.ready(), {
        retryReadinessOnFailure: true,
      }),
      scripts,
      terminals,
      tuiAgents,
      workspaceRegistry,
    },
    hostDependencies: hostDependencies.client,
  };
}

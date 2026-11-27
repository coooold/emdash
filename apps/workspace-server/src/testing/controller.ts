import { acpApiContract } from '@ply/core/runtimes/acp/api';
import { agentConfigContract } from '@ply/core/runtimes/agent-config/api';
import { automationsContract } from '@ply/core/runtimes/automations/api';
import { conversationsContract } from '@ply/core/runtimes/conversations/api';
import { fileSearchContract } from '@ply/core/runtimes/file-search/api';
import { filesContract } from '@ply/core/runtimes/files/api';
import { gitContract } from '@ply/core/runtimes/git/api';
import { hostSettingsContract } from '@ply/core/runtimes/host-settings/api';
import { lspContract } from '@ply/core/runtimes/lsp/api';
import { providerUsageContract } from '@ply/core/runtimes/provider-usage/api';
import { resourceUsageContract } from '@ply/core/runtimes/resource-usage/api';
import { scriptsContract } from '@ply/core/runtimes/scripts/api';
import { terminalsContract } from '@ply/core/runtimes/terminals/api';
import { tuiAgentsContract } from '@ply/core/runtimes/tui-agents/api';
import { workspaceRegistryContract } from '@ply/core/runtimes/workspace-registry/api';
import { hostDependenciesContract } from '@ply/core/services/host-dependencies/api';
import { client } from '@ply/wire/rpc';
import type { Connection, Contract, ContractClient, ContractDefinitions } from '@ply/wire/rpc';
import { createWorkspaceWireController, type WorkspaceWireControllerDeps } from '../api/controller';
import type { WorkspaceServerRuntimeClients } from '../gateway/workspace-workers';

type ControllerMetadata = Partial<
  Pick<WorkspaceWireControllerDeps, 'appVersion' | 'daemonId' | 'startedAt'>
>;

export function createTestWorkspaceWireController(
  runtimes: Partial<WorkspaceServerRuntimeClients> = {},
  metadata: ControllerMetadata = {}
) {
  return createWorkspaceWireController({
    ...metadata,
    runtimes: createTestRuntimeClients(runtimes),
    hostDependencies: createDisconnectedClient(hostDependenciesContract),
  });
}

export function createTestRuntimeClients(
  overrides: Partial<WorkspaceServerRuntimeClients> = {}
): WorkspaceServerRuntimeClients {
  return {
    acp: createDisconnectedClient(acpApiContract),
    providerUsage: createDisconnectedClient(providerUsageContract),
    agentConfig: createDisconnectedClient(agentConfigContract),
    automations: createDisconnectedClient(automationsContract),
    conversations: createDisconnectedClient(conversationsContract),
    fileSearch: createDisconnectedClient(fileSearchContract),
    files: createDisconnectedClient(filesContract),
    git: createDisconnectedClient(gitContract),
    hostSettings: createDisconnectedClient(hostSettingsContract),
    lsp: createDisconnectedClient(lspContract),
    resourceUsage: createDisconnectedClient(resourceUsageContract),
    scripts: createDisconnectedClient(scriptsContract),
    terminals: createDisconnectedClient(terminalsContract),
    tuiAgents: createDisconnectedClient(tuiAgentsContract),
    workspaceRegistry: createDisconnectedClient(workspaceRegistryContract),
    ...overrides,
  };
}

function createDisconnectedClient<Defs extends ContractDefinitions>(
  contract: Contract<Defs>
): ContractClient<Defs> {
  return client(contract, disconnectedConnection);
}

const disconnectedConnection: Connection = {
  call: async () => {
    throw new Error('Test runtime client is not connected');
  },
  openBlobConsumer: () => {
    throw new Error('Test runtime client is not connected');
  },
  openBlobProducer: () => {
    throw new Error('Test runtime client is not connected');
  },
  snapshot: async () => {
    throw new Error('Test runtime client is not connected');
  },
  attach: async () => {
    throw new Error('Test runtime client is not connected');
  },
  onDisconnect: () => () => {},
  dispose: () => {},
};

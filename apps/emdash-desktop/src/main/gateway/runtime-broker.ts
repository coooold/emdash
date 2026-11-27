import { hostRefEquals, LOCAL_HOST_REF } from '@emdash/core/primitives/host/api';
import { RuntimeBroker, runtimeHostNotConfigured } from '@emdash/core/services/runtime-broker/api';
import { err, ok } from '@emdash/shared';
import type { DesktopRuntimeClients } from './desktop-workers';

export function createDesktopRuntimeBroker(clients: DesktopRuntimeClients): RuntimeBroker {
  return new RuntimeBroker({
    resolve: (host) => {
      if (!hostRefEquals(host, LOCAL_HOST_REF)) {
        return err(runtimeHostNotConfigured(host, '此版本仅支持本地开发。'));
      }
      return ok({
        git: clients.git,
        fileSearch: clients.fileSearch,
        files: clients.files,
        lsp: clients.lsp,
        acp: clients.acp,
        automations: clients.automations,
        conversations: clients.conversations,
        tuiAgents: clients.tuiAgents,
        agentConfig: clients.agentConfig,
        providerUsage: clients.providerUsage,
        terminals: clients.terminals,
        workspaceRegistry: clients.workspaceRegistry,
        resourceUsage: clients.resourceUsage,
        hostDependencies: clients.hostDependencies,
        hostSettings: clients.hostSettings,
        scripts: clients.scripts,
      });
    },
  });
}

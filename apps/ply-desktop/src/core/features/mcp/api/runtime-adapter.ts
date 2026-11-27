import { agentConfigContract } from '@ply/core/runtimes/agent-config/api';
import {
  runtimeResolveErrorAsError,
  type HostRuntimesClient,
  type RuntimeBroker,
  type RuntimeResolveError,
} from '@ply/core/services/runtime-broker/api';

export { agentConfigContract as mcpConfigRuntimeContract };
export type McpHostRuntimesClient = HostRuntimesClient;
export type McpRuntimeBroker = Pick<RuntimeBroker, 'client'>;
export type McpRuntimeResolveError = RuntimeResolveError;

export function throwMcpRuntimeResolveError(error: RuntimeResolveError): never {
  throw runtimeResolveErrorAsError(error);
}

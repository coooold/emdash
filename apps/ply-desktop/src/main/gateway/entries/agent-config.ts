import { createAgentConfigComponent } from '@ply/core/runtimes/agent-config/node';
import { pluginRegistry } from '@ply/plugins/agents';
import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';

const logger = initWorkerProcessLogging('agent-config-runtime');
void runWireComponentWorker(createAgentConfigComponent({ pluginRegistry }), { logger });

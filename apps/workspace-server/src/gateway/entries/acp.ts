import { createAcpComponent } from '@ply/core/runtimes/acp/node';
import { pluginRegistry } from '@ply/plugins/agents';
import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';

const logger = initWorkerProcessLogging('acp-runtime');
void runWireComponentWorker(createAcpComponent({ pluginRegistry }), { logger });

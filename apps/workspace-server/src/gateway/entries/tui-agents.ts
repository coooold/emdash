import { createTuiAgentsComponent } from '@ply/core/runtimes/tui-agents/node';
import { pluginRegistry } from '@ply/plugins/agents';
import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';

const logger = initWorkerProcessLogging('tui-agents-runtime');
void runWireComponentWorker(createTuiAgentsComponent({ pluginRegistry }), { logger });

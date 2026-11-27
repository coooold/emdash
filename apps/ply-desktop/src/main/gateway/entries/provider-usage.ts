import { createProviderUsageComponent } from '@ply/core/runtimes/provider-usage/node';
import { pluginRegistry } from '@ply/plugins/agents';
import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';

const logger = initWorkerProcessLogging('provider-usage-runtime');
void runWireComponentWorker(createProviderUsageComponent({ pluginRegistry }), { logger });

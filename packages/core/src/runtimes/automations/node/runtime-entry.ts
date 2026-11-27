import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { createAutomationsComponent } from './component';

const logger = initWorkerProcessLogging('automations-runtime');
void runWireComponentWorker(createAutomationsComponent(), { logger });

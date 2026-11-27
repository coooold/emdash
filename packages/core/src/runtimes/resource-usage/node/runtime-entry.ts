import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { resourceUsageComponent } from './component';

const logger = initWorkerProcessLogging('resource-usage-runtime');
void runWireComponentWorker(resourceUsageComponent, { logger });

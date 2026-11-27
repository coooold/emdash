import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { scriptsComponent } from './component';

const logger = initWorkerProcessLogging('scripts-runtime');
void runWireComponentWorker(scriptsComponent, { logger });

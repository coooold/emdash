import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { terminalsComponent } from './component';

const logger = initWorkerProcessLogging('terminals-runtime');
void runWireComponentWorker(terminalsComponent, { logger });

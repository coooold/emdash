import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { filesComponent } from './component';

const logger = initWorkerProcessLogging('files-runtime');
void runWireComponentWorker(filesComponent, { logger });

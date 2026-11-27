import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { fsWatchComponent } from './component';

const logger = initWorkerProcessLogging('fs-watch-runtime');
void runWireComponentWorker(fsWatchComponent, { logger });

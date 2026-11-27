import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { gitComponent } from './component';

const logger = initWorkerProcessLogging('git-runtime');
void runWireComponentWorker(gitComponent, { logger });

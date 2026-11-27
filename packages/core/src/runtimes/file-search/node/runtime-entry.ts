import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { fileSearchComponent } from './component';

const logger = initWorkerProcessLogging('file-search-runtime');
void runWireComponentWorker(fileSearchComponent, { logger });

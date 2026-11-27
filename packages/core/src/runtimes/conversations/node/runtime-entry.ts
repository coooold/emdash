import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { conversationsComponent } from './component';

const logger = initWorkerProcessLogging('conversations-runtime');
void runWireComponentWorker(conversationsComponent, { logger });

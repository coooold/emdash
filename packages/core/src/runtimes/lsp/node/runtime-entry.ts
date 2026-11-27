import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { lspComponent } from './component';

void runWireComponentWorker(lspComponent, { logger: initWorkerProcessLogging('lsp-runtime') });

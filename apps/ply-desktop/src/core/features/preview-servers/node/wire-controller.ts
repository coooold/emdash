import { err } from '@ply/shared';
import { createController, type Controller } from '@ply/wire/rpc';
import { previewServersContract } from '../api';
import { previewServerEvents } from './event-host';
import type { PreviewServerAccessOperations } from './preview-server-access-service';

export function createPreviewServersWireController(
  service: PreviewServerAccessOperations
): Controller {
  return createController(previewServersContract, {
    listForWorkspace: (input) => service.listForWorkspace(input),
    forwardManual: () => err({ type: 'not-ssh-workspace', message: '此版本仅支持本地预览。' }),
    restart: (input) => service.restart(input),
    stop: (input) => service.stop(input),
    events: previewServerEvents,
  });
}

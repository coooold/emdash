import { hostRefEquals, LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import type { Scope } from '@ply/shared/concurrency';
import { createController, type Controller } from '@ply/wire/rpc';
import { hostsContract } from '../api';
import type { HostAvailabilityService } from './availability';
import { HostStateModel } from './state-model';

export function createHostsWireController(
  availability: HostAvailabilityService,
  scope: Scope
): Controller {
  const serverStates = scope.use(new HostStateModel());
  const unavailable = (): never => {
    throw new Error('此版本仅支持本地开发。');
  };
  return createController(hostsContract, {
    availability: availability.host,
    requestReady: ({ host, cause }) => {
      if (!hostRefEquals(host, LOCAL_HOST_REF)) unavailable();
      availability.requestReady(host, cause);
    },
    wake: ({ cause }) => availability.wakeDemanded(cause),
    serverStates: serverStates.host,
    disconnect: unavailable,
    refreshServerState: unavailable,
    installServer: unavailable,
    startServer: unavailable,
    stopServer: unavailable,
    restartServer: unavailable,
    updateServer: unavailable,
  });
}

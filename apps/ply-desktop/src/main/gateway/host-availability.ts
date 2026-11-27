import {
  isRuntimeResolveError,
  runtimeHostUnavailable,
} from '@ply/core/primitives/runtime-resolution/api';
import { err, ok } from '@ply/shared';
import type { Scope } from '@ply/shared/concurrency';
import { waitWithSignal } from '@ply/shared/scheduling';
import {
  createHostAvailability,
  type HostAvailabilityService,
} from '@core/services/hosts/node/availability';
import { createWorkerHostAvailability } from '@core/services/hosts/node/worker-host-availability';

export type CreateDesktopHostAvailabilityOptions = {
  scope: Scope;
  localReady(): Promise<void>;
};

export function createDesktopHostAvailability({
  scope,
  localReady,
}: CreateDesktopHostAvailabilityOptions): HostAvailabilityService {
  return createHostAvailability({
    scope,
    local: createWorkerHostAvailability({
      scope,
      readiness: {
        prepare: async (host, context) => {
          try {
            await waitWithSignal(localReady(), context.signal);
            return ok();
          } catch (error) {
            if (isRuntimeResolveError(error)) return err(error);
            return err(
              runtimeHostUnavailable(host, 'runtime-unavailable', '本地运行环境尚不可用。')
            );
          }
        },
      },
    }),
  });
}

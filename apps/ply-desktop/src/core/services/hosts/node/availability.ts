import { hostRefEquals, LOCAL_HOST_REF, type HostRef } from '@ply/core/primitives/host/api';
import {
  runtimeHostNotConfigured,
  type RuntimeResolveError,
} from '@ply/core/primitives/runtime-resolution/api';
import type { Result } from '@ply/shared';
import type { Scope } from '@ply/shared/concurrency';
import type { LeasedLiveModelProvider } from '@ply/wire/rpc';
import { cell, expose, peek, type Readable } from '@ply/wire/state';
import { hostReadyResult } from '../api/availability';
import type {
  BrowserHostWakeCause,
  ExplicitRecoveryCause,
  HostAvailability,
  HostAvailabilityState,
  HostReady,
  HostWakeCause,
  RecoveryCause,
} from '../api/availability';
import { hostsContract } from '../api/contract';

export type CreateHostAvailabilityOptions = {
  scope: Scope;
  local: HostAvailability;
};

/** Only the local worker host can become ready. Existing remote references stay blocked. */
export class HostAvailabilityService implements HostAvailability {
  readonly host: LeasedLiveModelProvider<typeof hostsContract.availability>;

  constructor(private readonly options: CreateHostAvailabilityOptions) {
    this.host = expose(hostsContract.availability, { state: ({ host }) => this.state(host) });
    options.scope.add(() => this.host.dispose());
  }

  state(host: HostRef): Readable<HostAvailabilityState> {
    if (hostRefEquals(host, LOCAL_HOST_REF)) return this.options.local.state(host);
    return cell<HostAvailabilityState>({
      kind: 'unavailable',
      issue: runtimeHostNotConfigured(host, '此版本仅支持本地开发。'),
      recovery: 'blocked',
    });
  }

  stateFor(host: HostRef): HostAvailabilityState {
    return peek(this.state(host));
  }

  requireReady(host: HostRef): Result<HostReady, RuntimeResolveError> {
    return hostReadyResult(host, this.stateFor(host));
  }

  lease(host: HostRef, owner: Scope): void {
    if (hostRefEquals(host, LOCAL_HOST_REF)) this.options.local.lease(host, owner);
  }

  wake(host: HostRef, cause: HostWakeCause): void {
    if (hostRefEquals(host, LOCAL_HOST_REF)) this.options.local.wake(host, cause);
  }

  wakeDemanded(cause: BrowserHostWakeCause): void {
    this.options.local.wakeDemanded(cause);
  }

  async ensureReady(
    host: HostRef,
    cause: RecoveryCause
  ): Promise<Result<HostReady, RuntimeResolveError>> {
    if (hostRefEquals(host, LOCAL_HOST_REF)) return this.options.local.ensureReady(host, cause);
    return this.requireReady(host);
  }

  requestReady(host: HostRef, cause: ExplicitRecoveryCause): void {
    if (hostRefEquals(host, LOCAL_HOST_REF)) this.options.local.requestReady(host, cause);
  }

  invalidate(host: HostRef, issue?: RuntimeResolveError): void {
    if (hostRefEquals(host, LOCAL_HOST_REF)) this.options.local.invalidate(host, issue);
  }

  suspend(host: HostRef): void {
    if (hostRefEquals(host, LOCAL_HOST_REF)) this.options.local.suspend(host);
  }
}

export function createHostAvailability(
  options: CreateHostAvailabilityOptions
): HostAvailabilityService {
  return new HostAvailabilityService(options);
}

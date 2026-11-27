import { hostRef, LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import { ok } from '@ply/shared';
import { createScope } from '@ply/shared/concurrency';
import { waitFor } from '@ply/shared/testing';
import { remote, snapshot, whenReady } from '@ply/wire/state';
import { createTestWire } from '@ply/wire/testing';
import { describe, expect, it, vi } from 'vitest';
import { hostsContract } from '../api';
import { createHostAvailability } from './availability';
import { createHostsWireController } from './wire-controller';
import { createWorkerHostAvailability } from './worker-host-availability';

describe('Hosts Wire availability', () => {
  it('publishes local worker readiness and rejects legacy remote commands', async () => {
    const scope = createScope({ label: 'hosts-wire-availability-test' });
    const workers = createWorkerHostAvailability({
      scope,
      readiness: { prepare: async () => ok() },
    });
    const availability = createHostAvailability({ scope, local: workers });
    const wakeDemanded = vi.spyOn(availability, 'wakeDemanded');
    const wire = createTestWire(hostsContract, createHostsWireController(availability, scope));
    const model = remote(hostsContract.availability, wire.client.availability);
    const state = model({ host: LOCAL_HOST_REF }).states.state;
    const savedHost = hostRef('remote', 'saved-ssh-host');
    try {
      expect((await whenReady(state, { scope })).value).toEqual({
        kind: 'unavailable',
        recovery: 'eligible',
      });

      await wire.client.requestReady({ host: LOCAL_HOST_REF, cause: 'connect' });
      await waitFor(() => snapshot(state).value?.kind === 'ready');
      expect(snapshot(state).value).toEqual({ kind: 'ready', generation: 1 });

      await wire.client.wake({ cause: 'online' });
      expect(wakeDemanded).toHaveBeenCalledWith('online');
      await expect(wire.client.requestReady({ host: savedHost, cause: 'connect' })).rejects.toThrow(
        '此版本仅支持本地开发。'
      );
      await expect(wire.client.installServer({ connectionId: savedHost.id })).rejects.toThrow(
        '此版本仅支持本地开发。'
      );
    } finally {
      await model.dispose();
      await wire.dispose();
      await scope.dispose();
    }
  });
});

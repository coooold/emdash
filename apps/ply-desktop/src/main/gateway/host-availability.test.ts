import { hostRef, LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import { createScope } from '@ply/shared/concurrency';
import { describe, expect, it, vi } from 'vitest';
import { createDesktopHostAvailability } from './host-availability';

describe('desktop Host availability', () => {
  it('reports local worker readiness and leaves saved SSH hosts blocked', async () => {
    const scope = createScope({ label: 'desktop-host-availability-test' });
    const localReady = vi.fn(async () => {});
    const availability = createDesktopHostAvailability({ scope, localReady });
    const host = hostRef('remote', 'saved-ssh-host');
    try {
      availability.lease(host, scope);
      availability.requestReady(host, 'connect');
      await expect(availability.ensureReady(host, 'connect')).resolves.toEqual({
        success: false,
        error: { type: 'not-configured', host, message: '此版本仅支持本地开发。' },
      });
      expect(availability.stateFor(host)).toMatchObject({
        kind: 'unavailable',
        recovery: 'blocked',
      });
      expect(localReady).not.toHaveBeenCalled();

      await expect(availability.ensureReady(LOCAL_HOST_REF, 'demand')).resolves.toMatchObject({
        success: true,
        data: { host: LOCAL_HOST_REF, generation: 1 },
      });
      expect(localReady).toHaveBeenCalledOnce();
    } finally {
      await scope.dispose();
    }
  });
});

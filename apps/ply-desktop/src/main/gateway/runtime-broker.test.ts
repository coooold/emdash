import { hostRef, LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import { describe, expect, it, vi } from 'vitest';
import type { DesktopRuntimeClients } from './desktop-workers';
import { createDesktopRuntimeBroker } from './runtime-broker';

describe('desktop runtime broker', () => {
  it('resolves the local desktop worker clients', async () => {
    const files = { getHomeDir: vi.fn() };
    const broker = createDesktopRuntimeBroker({ files } as unknown as DesktopRuntimeClients);

    await expect(broker.client(LOCAL_HOST_REF)).resolves.toMatchObject({
      success: true,
      data: { files },
    });
    broker.dispose();
  });

  it('keeps saved SSH hosts unconfigured without resolving a worker client', async () => {
    const broker = createDesktopRuntimeBroker({} as DesktopRuntimeClients);
    const host = hostRef('remote', 'saved-ssh-host');

    await expect(broker.client(host)).resolves.toEqual({
      success: false,
      error: { type: 'not-configured', host, message: '此版本仅支持本地开发。' },
    });
    broker.dispose();
  });
});

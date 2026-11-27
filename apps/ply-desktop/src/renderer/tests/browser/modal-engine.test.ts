import { ok } from '@ply/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { openModal } from '@core/manifests/browser/modal-api';
import { modalStore } from '@core/primitives/modals/react/modal-store';

afterEach(async () => {
  modalStore.dismiss();
  await Promise.resolve();
});

describe('modal engine', () => {
  it('connects the typed API to the modal store and resolves completed outcomes', async () => {
    const outcome = openModal('unsavedChangesModal', { fileName: 'README.md' });

    expect(modalStore.activeModalId).toBe('unsavedChangesModal');
    modalStore.complete('discard');

    await expect(outcome).resolves.toEqual(ok('discard'));
  });
});

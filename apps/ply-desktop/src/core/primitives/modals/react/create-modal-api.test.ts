import { err, type Result } from '@ply/shared';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { defineModalCatalog } from './catalog';
import { createModalApi } from './create-modal-api';
import { defineModal, type ModalDismissed } from './define-modal';

function ConfirmModal(_props: { title: string }) {
  return null;
}

function OptionalModal(_props: { category?: string }) {
  return null;
}

const confirmModal = defineModal<boolean>()({
  id: 'confirmModal',
  component: ConfirmModal,
});
const optionalModal = defineModal()({
  id: 'optionalModal',
  component: OptionalModal,
});
const catalog = defineModalCatalog([confirmModal, optionalModal] as const);

describe('createModalApi', () => {
  it('passes ids and props through the untyped transport', async () => {
    const open = vi
      .fn()
      .mockResolvedValue(err<ModalDismissed>({ type: 'modal_dismissed', reason: 'explicit' }));
    const api = createModalApi<typeof catalog>({ open });

    const outcome = api.openModal('confirmModal', { title: 'Continue?' });

    expectTypeOf(outcome).toEqualTypeOf<Promise<Result<boolean, ModalDismissed>>>();
    await expect(outcome).resolves.toEqual({
      success: false,
      error: { type: 'modal_dismissed', reason: 'explicit' },
    });
    expect(open).toHaveBeenCalledWith('confirmModal', { title: 'Continue?' });
  });

  it('supports omitting props when every field is optional', async () => {
    const open = vi
      .fn()
      .mockResolvedValue(err<ModalDismissed>({ type: 'modal_dismissed', reason: 'explicit' }));
    const api = createModalApi<typeof catalog>({ open });

    const outcome = api.openModal('optionalModal');

    expectTypeOf(outcome).toEqualTypeOf<Promise<Result<void, ModalDismissed>>>();
    await outcome;
    expect(open).toHaveBeenCalledWith('optionalModal', {});
  });

  it('fails clearly before the engine supplies a transport', () => {
    const api = createModalApi<typeof catalog>();

    expect(() => api.openModal('optionalModal')).toThrow(
      "Modal API is not connected; cannot open 'optionalModal'"
    );
  });
});

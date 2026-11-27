import { Button, Dialog } from '@emdash/ui/react/primitives';
import { useModalController } from '@core/manifests/browser/modal-api';
import { defineModal } from '@core/primitives/modals/react';

export type UnsavedChangesDialogResult = 'save' | 'discard';

export type UnsavedChangesDialogArgs = {
  fileName: string;
};

export function UnsavedChangesDialog({ fileName }: UnsavedChangesDialogArgs) {
  const controller = useModalController('unsavedChangesModal');

  return (
    <>
      <Dialog.Header showCloseButton={false}>
        <Dialog.Title>未保存的更改</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body className="pt-0">
        <p>
          要保存对<strong>{fileName}</strong>的更改吗？
        </p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="secondary" onClick={() => controller.complete('discard')}>
          放弃更改
        </Button>
        <Button variant="primary" onClick={() => controller.complete('save')}>
          保存
        </Button>
      </Dialog.Footer>
    </>
  );
}

export const unsavedChangesModal = defineModal<UnsavedChangesDialogResult>()({
  id: 'unsavedChangesModal',
  component: UnsavedChangesDialog,
  size: 'xs',
});

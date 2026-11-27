import { Button, Dialog } from '@ply/ui/react/primitives';
import { useModalController } from '@core/manifests/browser/modal-api';
import { defineModal } from '@core/primitives/modals/react';

export type QuitUnsavedChangesResult = 'save-all' | 'discard';

export interface QuitUnsavedChangesDialogArgs {
  count: number;
}

export function QuitUnsavedChangesDialog({ count }: QuitUnsavedChangesDialogArgs) {
  const controller = useModalController('quitUnsavedChangesModal');

  return (
    <>
      <Dialog.Header showCloseButton={false}>
        <Dialog.Title>退出前保存更改？</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body className="pt-0">
        <p>有 {count} 个文件包含未保存的更改。要在退出 ply 前保存吗？</p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="secondary" onClick={controller.dismiss}>
          取消
        </Button>
        <Button variant="secondary" onClick={() => controller.complete('discard')}>
          放弃更改
        </Button>
        <Button variant="primary" onClick={() => controller.complete('save-all')}>
          全部保存
        </Button>
      </Dialog.Footer>
    </>
  );
}

export const quitUnsavedChangesModal = defineModal<QuitUnsavedChangesResult>()({
  id: 'quitUnsavedChangesModal',
  component: QuitUnsavedChangesDialog,
  size: 'sm',
});

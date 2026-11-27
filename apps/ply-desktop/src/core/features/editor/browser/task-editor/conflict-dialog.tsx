import { Button, Dialog } from '@ply/ui/react/primitives';
import { useEffect } from 'react';
import { useModalController } from '@core/manifests/browser/modal-api';
import { defineModal } from '@core/primitives/modals/react';

export type ConflictDialogArgs = {
  filePath: string;
};

export function ConflictDialog({ filePath }: ConflictDialogArgs) {
  const { complete, setCloseGuard } = useModalController('conflictDialog');
  const shortPath = filePath.split('/').slice(-2).join('/');

  useEffect(() => {
    setCloseGuard(true);
    return () => setCloseGuard(false);
  }, [setCloseGuard]);

  return (
    <>
      <Dialog.Header showCloseButton={false}>
        <Dialog.Title>文件已被外部修改</Dialog.Title>
        <Dialog.Description>
          <code className="bg-muted rounded px-1 py-0.5 text-xs">{shortPath}</code>{' '}
          已在编辑器外修改。你还有未保存的更改，请选择要保留的版本。
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer className="gap-2">
        <Button variant="secondary" onClick={() => complete(false)}>
          保留我的修改
        </Button>
        <Button variant="primary" onClick={() => complete(true)}>
          采用外部修改
        </Button>
      </Dialog.Footer>
    </>
  );
}

export const conflictDialog = defineModal<boolean>()({
  id: 'conflictDialog',
  component: ConflictDialog,
  size: 'sm',
});

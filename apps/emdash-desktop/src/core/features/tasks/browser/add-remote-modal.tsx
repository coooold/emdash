import { Dialog, Field, Input, ModalLayout } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { BrokenSettingNotice } from '@core/features/projects/contributions/browser/settings-provenance';
import {
  getGitCheckoutStore,
  getGitRepositoryStore,
} from '@core/features/source-control/api/browser/stores/source-control-selectors';
import { useModalController } from '@core/manifests/browser/modal-api';
import { DEFAULT_REMOTE_NAME } from '@core/primitives/git/api';
import { ConfirmButton } from '@core/primitives/keybindings/browser/confirm-button';
import { defineModal } from '@core/primitives/modals/react';
export type AddRemoteModalArgs = {
  projectId: string;
  projectName: string;
  workspaceId: string;
};

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.length > 0) return error;
  if (error instanceof Error && error.message.length > 0) return error.message;
  return fallback;
}

export const AddRemoteModal = observer(function AddRemoteModal({
  projectId,
  workspaceId,
}: AddRemoteModalArgs) {
  const { complete } = useModalController('addRemoteModal');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isValid = url.trim().length > 0;
  const repositoryStore = getGitRepositoryStore(projectId);
  const checkoutStore = getGitCheckoutStore(workspaceId);
  const pushRemoteResolution = repositoryStore?.effectiveGitSettings.pushRemote ?? null;
  // The effective push remote when one resolves; otherwise this modal is
  // creating the repository's first remote, and DEFAULT_REMOTE_NAME is the
  // conventional name for a brand-new remote (a naming default, not
  // resolution).
  const selectedRemote = repositoryStore?.pushRemote?.name ?? DEFAULT_REMOTE_NAME;
  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (!repositoryStore) throw new Error('Git 仓库不可用');
      if (!checkoutStore) throw new Error('Git 检出不可用');
      const addRemoteResult = await repositoryStore.addRemote(selectedRemote, url.trim());
      if (!addRemoteResult.success) {
        setError(toErrorMessage(addRemoteResult.error, '添加远端失败'));
        return;
      }

      const fetchResult = await repositoryStore.fetchRemote();
      if (!fetchResult.success) {
        setError(toErrorMessage(fetchResult.error, '获取远端失败'));
        return;
      }

      const publishResult = await checkoutStore.publishCurrentBranch();
      if (!publishResult.success) {
        if (publishResult.error.type === 'rejected') {
          repositoryStore?.refreshLocal();
          repositoryStore?.refreshRemote();
          setError('已添加远端。远端已有提交，请手动整合两边的提交历史。');
          return;
        }
        setError(toErrorMessage(publishResult.error, '发布分支失败'));
        return;
      }

      repositoryStore?.refreshLocal();
      repositoryStore?.refreshRemote();
      complete();
    } catch (e) {
      setError(toErrorMessage(e, '操作失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout
      header={
        <Dialog.Header>
          <Dialog.Title>添加 Git 远端</Dialog.Title>
        </Dialog.Header>
      }
      footer={
        <Dialog.Footer>
          <ConfirmButton
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? '正在添加…' : '添加并发布'}
          </ConfirmButton>
        </Dialog.Footer>
      }
    >
      <Dialog.Body className="gap-4">
        <Field.Root>
          <Field.Label>远端 URL</Field.Label>
          <Input
            autoFocus
            placeholder="https://git.example.com/owner/repo.git"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field.Root>

        {pushRemoteResolution?.provenance.kind === 'broken-setting' ? (
          <BrokenSettingNotice
            staleValue={pushRemoteResolution.provenance.staleValue}
            effectiveValue={pushRemoteResolution.value}
          />
        ) : null}

        {error && <p className="text-destructive text-sm">{error}</p>}
      </Dialog.Body>
    </ModalLayout>
  );
});

export const addRemoteModal = defineModal<void>()({
  id: 'addRemoteModal',
  component: AddRemoteModal,
});

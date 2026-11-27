import { Button, Dialog, Field, Input } from '@ply/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import { useTaskSettings } from '@core/features/tasks/api/browser/hooks/useTaskSettings';
import { getTaskManagerStore } from '@core/features/tasks/api/browser/task-state/task-selectors';
import {
  liveTransformTaskName,
  MAX_TASK_NAME_LENGTH,
  normalizeTaskName,
  taskNameCollisionKey,
} from '@core/features/tasks/api/browser/taskNames';
import { useModalController } from '@core/manifests/browser/modal-api';
import { ConfirmButton } from '@core/primitives/keybindings/browser/confirm-button';
import { defineModal } from '@core/primitives/modals/react';

type RenameTaskModalArgs = {
  projectId: string;
  taskId: string;
  currentName: string;
};

export const RenameTaskModal = observer(function RenameTaskModal({
  projectId,
  taskId,
  currentName,
}: RenameTaskModalArgs) {
  const { complete, dismiss } = useModalController('renameTaskModal');
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { preserveNameCapitalization } = useTaskSettings();

  const taskManager = getTaskManagerStore(projectId);
  const siblingNames = new Set(
    Array.from(taskManager?.tasks.values() ?? [])
      .filter((t) => t.state !== 'unregistered' && t.data.id !== taskId)
      .map((t) => taskNameCollisionKey(t.data.name))
  );

  const normalizedName = normalizeTaskName(name, {
    preserveCapitalization: preserveNameCapitalization,
  });
  const isDuplicate = siblingNames.has(taskNameCollisionKey(normalizedName));
  const isUnchanged = normalizedName === currentName;
  const isEmpty = normalizedName.length === 0;
  const isValid = !isEmpty && !isDuplicate && !isUnchanged;

  const validationMessage = isDuplicate
    ? '此项目中已有同名任务。'
    : isEmpty
      ? '任务名称不能为空。'
      : undefined;

  const handleNameChange = useCallback(
    (value: string) => {
      setName(
        liveTransformTaskName(value, {
          preserveCapitalization: preserveNameCapitalization,
        })
      );
      setError(null);
    },
    [preserveNameCapitalization]
  );

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    const task = taskManager?.tasks.get(taskId);
    if (!task) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await task.rename(normalizedName);
      if (!result.success) {
        setError('未找到任务。');
        setIsSubmitting(false);
        return;
      }
      complete();
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法重命名任务');
      setIsSubmitting(false);
    }
  }, [isValid, taskManager, taskId, normalizedName, complete]);

  return (
    <>
      <Dialog.Header showCloseButton={false}>
        <Dialog.Title>重命名任务</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body className="pt-0">
        <Field.Group>
          <Field.Root>
            <Field.Label>任务名称</Field.Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              maxLength={MAX_TASK_NAME_LENGTH}
              autoFocus
            />
            {validationMessage && !isUnchanged && (
              <p className="text-destructive mt-1 text-xs">{validationMessage}</p>
            )}
            {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
          </Field.Root>
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="secondary" onClick={dismiss}>
          取消
        </Button>
        <ConfirmButton
          variant="primary"
          onClick={() => void handleSubmit()}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? '正在重命名…' : '重命名'}
        </ConfirmButton>
      </Dialog.Footer>
    </>
  );
});

export const renameTaskModal = defineModal<void>()({
  id: 'renameTaskModal',
  component: RenameTaskModal,
  size: 'xs',
});

import { toast } from '@emdash/ui/react/primitives';
import { getAutomationsClient } from '@core/features/automations/api/browser/client';
import { getProjectManagerStore } from '@core/features/projects/api/browser/stores/project-selectors';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import type { Automation } from '@core/primitives/automations/api';

async function listProjectAutomations(projectId: string): Promise<Automation[]> {
  return getAutomationsClient()
    .then((client) => client.list({ projectId }))
    .catch(() => []);
}

function deleteProjectDescription(
  projectLabel: string,
  automations: Automation[],
  legacySsh: boolean
) {
  const description = legacySsh
    ? `「${projectLabel}」及其任务记录将从本机应用中移除。远程仓库和工作树会保留。`
    : `「${projectLabel}」将从应用中移除。项目目录和工作树会保留。`;
  if (automations.length === 0) return description;

  return (
    <div className="space-y-3">
      <p>{description}</p>
      <div className="space-y-2">
        <p className="text-foreground-muted">
          {legacySsh
            ? '以下自动化记录将一并移除。'
            : '以下自动化将与此项目解除关联，重新关联到其他项目前不会运行。'}
        </p>
        <ul className="max-h-32 space-y-1 overflow-auto rounded-md border border-border bg-background-secondary p-2 text-sm">
          {automations.map((automation) => (
            <li key={automation.id} className="truncate">
              {automation.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function useConfirmDeleteProject() {
  const openConfirmDeleteProject = useOpenModal('confirmActionModal');

  return async ({
    projectId,
    projectLabel,
    onDeleted,
  }: {
    projectId: string;
    projectLabel: string;
    onDeleted?: () => void;
  }) => {
    const manager = getProjectManagerStore();
    const legacySsh = manager.projects.get(projectId)?.data?.type === 'ssh';
    const automations = await listProjectAutomations(projectId);

    const outcome = await openConfirmDeleteProject({
      title: legacySsh ? '移除项目记录' : '移除项目',
      description: deleteProjectDescription(projectLabel, automations, legacySsh),
      confirmLabel: '移除',
    });
    if (!outcome.success) return;
    try {
      await manager.deleteProject(projectId);
      onDeleted?.();
    } catch (error) {
      toast.error('无法移除项目', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

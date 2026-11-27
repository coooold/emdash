import { menuItemBase } from '@ply/ui/styles/recipes/menu-item';
import { GitBranch, type LucideIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { projectAvailabilityUiContribution as projectAvailabilityUi } from '@core/features/projects/contributions/browser/project-availability-ui';
import { taskHostActionAvailability } from '@core/features/tasks/api/browser/task-state/task-selectors';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import { Shortcut } from '@core/primitives/keybindings/browser/shortcut';
import { useArrowKeyNavigation } from '@core/primitives/react-hooks/browser/use-arrow-key-navigation';
import { cn } from '@core/primitives/styling/browser/cn';

interface TaskAction {
  label: string;
  description: string;
  icon: LucideIcon;
  disabled: boolean;
  disabledReason?: string;
  onActivate: () => void;
}

export const TaskListEmptyState = observer(function TaskListEmptyState({
  projectId,
}: {
  projectId: string;
}) {
  const openTaskModal = useOpenModal('taskModal');
  const createAvailability = taskHostActionAvailability(projectId);
  const createDisabledReason =
    createAvailability.kind === 'disabled'
      ? (projectAvailabilityUi.getLiveActionDisabledReason(projectId) ??
        projectAvailabilityUi.defaultLiveActionDisabledReason)
      : undefined;

  const actions: TaskAction[] = [
    {
      label: '从分支创建任务',
      description: '使用现有 Git 分支创建任务',
      icon: GitBranch,
      disabled: !!createDisabledReason,
      disabledReason: createDisabledReason,
      onActivate: () => void openTaskModal({ projectId, strategy: 'from-branch' }),
    },
  ];

  const { selectedIndex, setSelectedIndex } = useArrowKeyNavigation(actions.length, (index) => {
    const action = actions[index];
    if (action && !action.disabled) action.onActivate();
  });

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col gap-1">
        {actions.map((action, i) => (
          <TaskActionRow
            key={action.label}
            action={action}
            isSelected={i === selectedIndex}
            onMouseEnter={() => setSelectedIndex(i)}
          />
        ))}
      </div>
    </div>
  );
});

function TaskActionRow({
  action,
  isSelected,
  onMouseEnter,
}: {
  action: TaskAction;
  isSelected: boolean;
  onMouseEnter: () => void;
}) {
  const { label, description, icon: Icon, disabled, disabledReason, onActivate } = action;
  return (
    <button
      type="button"
      aria-label={disabledReason ? `${label}. ${disabledReason}` : label}
      disabled={disabled}
      onClick={disabled ? undefined : onActivate}
      onMouseEnter={disabled ? undefined : onMouseEnter}
      className={cn(
        menuItemBase({ fullWidth: true }),
        'justify-between',
        disabled ? 'opacity-50' : 'hover:bg-background-1',
        !disabled && isSelected && 'bg-background-1'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-7 shrink-0 text-foreground-passive" strokeWidth={1} />
        <div className="flex flex-col gap-1 text-left">
          <span
            className={cn(
              'text-sm whitespace-nowrap text-foreground-muted transition-colors',
              !disabled && isSelected && 'text-foreground'
            )}
          >
            {label}
          </span>
          <span className="text-xs text-foreground-passive">
            {disabled && disabledReason ? disabledReason : description}
          </span>
        </div>
      </div>
      {!disabled && isSelected && <Shortcut hotkey="Enter" variant="keycaps" />}
    </button>
  );
}

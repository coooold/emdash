import { Input, Label, Switch } from '@emdash/ui/react/primitives';
import type { BranchNameState } from '@core/features/tasks/browser/create-task-modal/use-branch-name';
import { useTaskConfig } from '@core/features/tasks/contributions/browser/task-config/task-config-context';

interface BranchNameFieldProps {
  state: Pick<BranchNameState, 'branchName' | 'setBranchName' | 'branchAlreadyExists'>;
  pushBranch?: boolean;
  onPushBranchChange?: (value: boolean) => void;
}

export function BranchNameField({ state, pushBranch, onPushBranchChange }: BranchNameFieldProps) {
  const { autoBranchName } = useTaskConfig();
  const { branchName, setBranchName, branchAlreadyExists } = state;
  const showPush = pushBranch !== undefined && onPushBranchChange !== undefined;

  return (
    <div className="flex flex-col rounded-lg border border-border px-2.5 py-2">
      <span className="flex items-center gap-1.5 text-xs text-foreground-passive">分支名称</span>
      {autoBranchName ? (
        <span className="py-1 text-sm text-foreground-muted italic">将自动生成分支名称</span>
      ) : (
        <>
          <Input
            bare
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="branch-name"
            className="px-0"
          />
          {branchAlreadyExists && (
            <p className="text-muted-foreground mt-1 text-xs">该分支已存在，任务将检出此分支。</p>
          )}
        </>
      )}
      {showPush && (
        <div className="mt-1 flex items-center gap-1.5">
          <Switch size="sm" checked={pushBranch} onCheckedChange={onPushBranchChange} />
          <Label>推送分支到远端</Label>
        </div>
      )}
    </div>
  );
}

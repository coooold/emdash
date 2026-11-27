import { Collapsible, Combobox, Field, Switch } from '@ply/ui/react/primitives';
import { ChevronDown, GitBranch } from 'lucide-react';
import { BranchDisplay } from '@core/features/source-control/contributions/browser/branch-display';
import { ProjectBranchSelector } from '@core/features/source-control/contributions/browser/project-branch-selector';
import type { BranchNameState } from '@core/features/tasks/browser/create-task-modal/use-branch-name';
import type { BranchSelectionState } from '@core/features/tasks/browser/create-task-modal/use-branch-selection';
import { cn } from '@core/primitives/styling/browser/cn';
import { BranchNameField } from './branch-name-field';

interface BranchPickerFieldProps {
  state: BranchSelectionState;
  branchNameState?: BranchNameState;
  projectId?: string;
  currentBranch?: string | null;
  label?: string;
  className?: string;
  isUnborn?: boolean;
}

export function BranchPickerField({
  state,
  branchNameState,
  projectId,
  currentBranch,
  label = '来源分支',
  className,
  isUnborn = false,
}: BranchPickerFieldProps) {
  const { createBranchAndWorktree, setCreateBranchAndWorktree, pushBranch, setPushBranch } = state;

  return (
    <div className={cn('border border-border rounded-md overflow-hidden', className)}>
      {!createBranchAndWorktree && currentBranch ? (
        <BranchDisplay label={label} branchName={currentBranch} />
      ) : projectId ? (
        <ProjectBranchSelector
          projectId={projectId}
          value={state.selectedBranch}
          onValueChange={state.setSelectedBranch}
          showRemoteSelectorFooter
          trigger={
            <Combobox.Trigger className="flex w-full items-center justify-between gap-2 p-2 outline-none hover:bg-background-1 data-popup-open:bg-background-1">
              <div className="flex flex-col gap-0.5 text-left text-sm">
                <span className="text-xs text-foreground-passive">{label}</span>
                <span className="flex items-center gap-1">
                  <GitBranch
                    absoluteStrokeWidth
                    strokeWidth={2}
                    className="size-3.5 shrink-0 text-foreground-muted"
                  />
                  <Combobox.Value placeholder="选择分支" />
                </span>
              </div>

              <ChevronDown className="size-4 shrink-0 text-foreground-muted" />
            </Combobox.Trigger>
          }
        />
      ) : null}
      {!isUnborn && (
        <Collapsible.Root className="border-t border-border">
          <Collapsible.Trigger
            hideChevron
            className="flex w-full items-center justify-between gap-2 p-2 text-xs text-foreground-muted hover:bg-background-1 data-open:bg-background-1"
          >
            分支创建和推送设置
            <ChevronDown className="size-4 shrink-0 text-foreground-muted" />
          </Collapsible.Trigger>
          <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out">
            <div className="flex flex-col gap-2 p-2">
              <Field.Root orientation="horizontal">
                <Switch
                  checked={createBranchAndWorktree}
                  onCheckedChange={setCreateBranchAndWorktree}
                />
                <Field.Label>创建任务分支和工作树</Field.Label>
              </Field.Root>
              {createBranchAndWorktree && (
                <>
                  {branchNameState && <BranchNameField state={branchNameState} />}
                  <Field.Root orientation="horizontal">
                    <Switch checked={pushBranch} onCheckedChange={setPushBranch} />
                    <Field.Label>推送分支到远端</Field.Label>
                  </Field.Root>
                </>
              )}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
      {isUnborn && (
        <p className="border-t border-border bg-background-1 px-2 py-1 text-xs text-foreground-muted">
          请先创建初始提交，再基于分支创建任务。
        </p>
      )}
    </div>
  );
}

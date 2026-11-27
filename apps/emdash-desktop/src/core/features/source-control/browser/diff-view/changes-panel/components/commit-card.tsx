import { Input, SplitButton, Textarea, toast } from '@emdash/ui/react/primitives';
import { card } from '@emdash/ui/styles/recipes/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { formatPushErrorDetail } from '@core/features/source-control/api/git-error-messages';
import { gitCheckoutStoreToken } from '@core/features/source-control/contributions/browser/workspace-store-tokens';
import { formatErrorType } from '@core/features/tasks/api/browser/utils';
import {
  useTaskComposition,
  useWorkspace,
} from '@core/features/workbench/api/browser/task-composition-context';
import { cn } from '@core/primitives/styling/browser/cn';

type CommitPhase =
  | 'idle'
  | 'committing'
  | 'commit-only-done'
  | 'committed'
  | 'pushing'
  | 'pushed';

interface CommitCardProps {
  autoStage?: boolean;
}

export const CommitCard = observer(function CommitCard({ autoStage = false }: CommitCardProps) {
  const taskView = useTaskComposition();
  const workspace = useWorkspace();
  const git = workspace.get(gitCheckoutStoreToken);
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView ?? null;
  const hasPRs = changesView?.expandedSections.pullRequests ?? false;
  const [commitMessage, setCommitMessage] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<CommitPhase>('idle');
  const fullMessage = description ? `${commitMessage}\n\n${description}` : commitMessage;
  const isInFlight = phase !== 'idle';

  if (!diffView || !changesView) return null;

  const stageAllIfNeeded = async (): Promise<boolean> => {
    if (!autoStage) return true;
    changesView.suppressNextAutoExpand('staged');
    const result = await git.stageAllFiles();
    if (!result.success) {
      toast.error(`暂存变更失败：${formatErrorType(result.error)} `);
      setPhase('idle');
      return false;
    }
    return true;
  };

  const doCommit = async () => {
    setPhase('committing');
    if (!(await stageAllIfNeeded())) return;
    const result = await git.commit(fullMessage);
    if (!result.success) {
      toast.error(`提交变更失败：${formatErrorType(result.error)} `);
      setPhase('idle');
      return;
    }
    setCommitMessage('');
    setDescription('');
    if (!autoStage) {
      changesView.setExpanded({ unstaged: true, staged: false, pullRequests: hasPRs });
    }
    setPhase('commit-only-done');
    setTimeout(() => setPhase('idle'), 3000);
  };

  const doCommitAndPush = async () => {
    setPhase('committing');
    if (!(await stageAllIfNeeded())) return;
    const commitResult = await git.commit(fullMessage);
    if (!commitResult.success) {
      toast.error(`提交变更失败：${formatErrorType(commitResult.error)} `);
      setPhase('idle');
      return;
    }
    setCommitMessage('');
    setDescription('');
    if (!autoStage) {
      changesView.setExpanded({ unstaged: true, staged: false, pullRequests: hasPRs });
    }
    setPhase('committed');
    await new Promise((r) => setTimeout(r, 1000));
    setPhase('pushing');
    const pushResult = await git.push();
    if (!pushResult.success) {
      toast.error(`推送失败：${formatPushErrorDetail(pushResult.error)}`);
      setPhase('idle');
      return;
    }
    setPhase('pushed');
    setTimeout(() => setPhase('idle'), 3000);
  };

  const actions = [
    { id: 'commit', label: '提交', action: () => void doCommit() },
    { id: 'commit-push', label: '提交并推送', action: () => void doCommitAndPush() },
  ];

  const effectiveAction =
    diffView.effectiveCommitAction === 'commit-pr'
      ? 'commit-push'
      : diffView.effectiveCommitAction;

  return (
    <div
      className={cn(
        card({ level: 'elevated-emphasis', radius: 'lg', padding: 'sm' }),
        'mx-2 mb-2 flex shrink-0 flex-col items-center justify-between gap-2'
      )}
    >
      <Input
        placeholder="提交信息"
        className="w-full bg-background"
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        disabled={isInFlight}
      />
      <Textarea
        placeholder="详细说明"
        className="w-full bg-background"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isInFlight}
      />
      {phase === 'idle' && (
        <SplitButton
          options={actions.map(({ id, label }) => ({ id, label }))}
          size="sm"
          fullWidth
          disabled={!commitMessage.trim()}
          selectedId={effectiveAction}
          onSelectedChange={(id) =>
            diffView.setCommitAction(id as 'commit' | 'commit-push')
          }
          commitOnSelect={false}
          onAction={(id) => actions.find((a) => a.id === id)?.action()}
        />
      )}
      {phase === 'committing' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="正在提交…" />
      )}
      {(phase === 'commit-only-done' || phase === 'committed') && (
        <StatusRow
          icon={<CheckCircle className="size-4 text-foreground-success" />}
          label="已提交"
        />
      )}
      {phase === 'pushing' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="正在推送…" />
      )}
      {phase === 'pushed' && (
        <StatusRow
          icon={<CheckCircle className="size-4 text-foreground-success" />}
          label="已推送"
        />
      )}
    </div>
  );
});

function StatusRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex w-full items-center justify-center gap-2 py-1 text-sm text-foreground-muted">
      {icon}
      <span>{label}</span>
    </div>
  );
}

import { safeDirectoryCommand, type GitDubiousOwnership } from '@ply/core/primitives/git/api';
import type { Result } from '@ply/shared';
import { Alert, Button } from '@ply/ui/react/primitives';
import { useState, type ReactNode } from 'react';
import { CopyButton } from '@core/primitives/agents/browser/install-command-row';

export type TrustRepositoryConfirmation = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  variant: 'default';
};

/**
 * Explains Git's refusal to open a repository it does not consider owned by the user and offers
 * to add Git's own `safe.directory` suggestion, only after an explicit confirmation.
 */
export function UntrustedRepositoryNotice({
  dubiousOwnership,
  confirm,
  trust,
  onTrusted,
}: {
  dubiousOwnership: GitDubiousOwnership;
  confirm(confirmation: TrustRepositoryConfirmation): Promise<boolean>;
  trust(): Promise<Result<unknown, { message: string }>>;
  onTrusted(): Promise<unknown> | void;
}) {
  const [state, setState] = useState<
    { kind: 'idle' | 'trusting' } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });
  const { command, requiresPowerShell } = safeDirectoryCommand(dubiousOwnership.safeDirectory);

  const handleTrust = async () => {
    const confirmed = await confirm({
      title: '信任此仓库？',
      description: (
        <div className="flex flex-col gap-3">
          <p>ply 将在本机上运行以下命令：</p>
          <CommandBlock command={command} />
          <p className="text-foreground-muted">
            这会修改全局 Git 配置，之后 Git、代理和终端都可以打开此仓库。仓库的 Git
            配置可以运行程序，请只信任了解的仓库。
          </p>
        </div>
      ),
      confirmLabel: '信任仓库',
      variant: 'default',
    });
    if (!confirmed) return;

    setState({ kind: 'trusting' });
    try {
      const result = await trust();
      if (!result.success) {
        setState({ kind: 'failed', message: result.error.message });
        return;
      }
      await onTrusted();
      setState({ kind: 'idle' });
    } catch (error) {
      setState({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <Alert.Root status="warning">
      <Alert.Title>Git 不信任此仓库</Alert.Title>
      <div className="flex flex-col gap-2 text-xs">
        <Alert.Description>
          Git 无法确认目录 <span className="wrap-anywhere">{dubiousOwnership.repositoryPath}</span>{' '}
          属于本机上运行 Git 的用户。这在 WSL、网络共享或外接存储中的目录里比较常见。
          {requiresPowerShell ? '如要信任，请在 PowerShell 中运行：' : '如要信任，请运行：'}
        </Alert.Description>
        <CommandBlock command={command} />
        {state.kind === 'failed' && <p className="text-destructive">{state.message}</p>}
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={state.kind === 'trusting'}
            onClick={() => void handleTrust()}
          >
            {state.kind === 'trusting' ? '正在信任…' : '信任仓库…'}
          </Button>
        </div>
      </div>
    </Alert.Root>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div className="group flex items-start gap-2 rounded-md bg-background-quaternary-1 px-2 py-1.5">
      <code className="min-w-0 flex-1 font-mono text-xs wrap-break-word whitespace-pre-wrap text-foreground">
        {command}
      </code>
      <CopyButton command={command} />
    </div>
  );
}

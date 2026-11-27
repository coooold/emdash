import { Field, Input, Separator, Switch } from '@ply/ui/react/primitives';
import { useId, type ReactNode } from 'react';
import { DirectoryField } from './local-directory-selector';
import { type CloneModeState, type PickModeState } from './modes';

export function PickExistingPanel({
  state,
  inspectionError,
  untrustedRepositoryNotice,
  showInitializeGitPrompt,
}: {
  state: PickModeState;
  inspectionError?: string;
  /** Replaces the inspection error when Git refused the repository for its ownership. */
  untrustedRepositoryNotice?: ReactNode;
  showInitializeGitPrompt: boolean;
}) {
  return (
    <Field.Group>
      <Field.Root>
        <Field.Label>目录</Field.Label>
        <DirectoryField
          path={state.path}
          onPathChange={state.handlePathChange}
          title="选择本地项目"
          message="选择要打开的项目目录"
        />
      </Field.Root>
      {untrustedRepositoryNotice}
      {!untrustedRepositoryNotice && inspectionError && (
        <div className="border-destructive/40 overflow-hidden rounded-md border">
          <p className="border-destructive/30 bg-destructive/10 text-destructive border-b px-2 py-1 text-xs">
            无法检查此目录。
          </p>
          <p className="p-2 text-xs text-foreground-muted">{inspectionError}</p>
        </div>
      )}
      {showInitializeGitPrompt && (
        <div className="overflow-hidden rounded-md border border-border">
          <p className="border-b border-border bg-background-1 px-2 py-1 text-xs text-foreground-muted">
            此目录还不是 Git 仓库。
          </p>
          <div className="p-2">
            <Field.Root orientation="horizontal">
              <Switch
                checked={state.initGitRepository}
                onCheckedChange={state.setinitGitRepository}
              />
              <Field.Label>初始化 Git 仓库</Field.Label>
            </Field.Root>
            <p className="mt-1.5 text-xs text-foreground-muted">
              也可以先打开此文件夹，之后在更改视图中初始化 Git。
            </p>
          </div>
        </div>
      )}
    </Field.Group>
  );
}

export function ClonePanel({ state }: { state: CloneModeState }) {
  const repositoryUrlId = useId();
  return (
    <div className="flex flex-col gap-6">
      <Field.Group>
        <Field.Root>
          <Field.Label htmlFor={repositoryUrlId}>仓库地址</Field.Label>
          <Input
            id={repositoryUrlId}
            autoFocus
            placeholder="输入仓库地址"
            value={state.repositoryUrl}
            onChange={(e) => state.handleRepositoryUrlChange(e.target.value)}
          />
        </Field.Root>
      </Field.Group>
      <Separator className="w-full" />
      <Field.Group>
        <Field.Root>
          <Field.Label>项目目录</Field.Label>
          <DirectoryField
            path={state.path}
            onPathChange={state.setPath}
            title="选择本地项目"
            message="选择要打开的项目目录"
          />
        </Field.Root>
      </Field.Group>
    </div>
  );
}

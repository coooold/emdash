import { SettingsCard } from '@emdash/ui/react/patterns';
import { Field, Input, Separator, Switch, Textarea, toast } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { detectPlatformContext } from '@core/primitives/keybindings/api';
import { useHostSettings } from '../use-host-settings';

/**
 * Local shell setup, worktree root, and tmux defaults. Text fields commit
 * on blur and switches commit immediately.
 * External edits to the host's settings file stream in through the live model
 * while a field is not focused.
 */
export const HostSettingsCard = observer(function HostSettingsCard() {
  const { settings, parseError, isLoading, update } = useHostSettings(undefined, true);
  const tmuxSupported = detectPlatformContext().os !== 'windows';
  const [shellSetup, setShellSetup] = useState('');
  const [worktreeRoot, setWorktreeRoot] = useState('');
  const [editing, setEditing] = useState<'shellSetup' | 'worktreeRoot' | null>(
    null
  );

  useEffect(() => {
    if (editing !== 'shellSetup') setShellSetup(settings?.shellSetup ?? '');
  }, [settings?.shellSetup, editing]);
  useEffect(() => {
    if (editing !== 'worktreeRoot') setWorktreeRoot(settings?.worktreeRoot ?? '');
  }, [settings?.worktreeRoot, editing]);

  const commit = async (patch: Parameters<typeof update>[0]) => {
    try {
      await update(patch);
    } catch (error) {
      toast.error('无法保存本机设置', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const commitText = (field: 'shellSetup' | 'worktreeRoot', value: string) => {
    setEditing(null);
    const trimmed = value.trim();
    if (trimmed === (settings?.[field] ?? '')) return;
    void commit({ [field]: trimmed || null });
  };

  const disabled = isLoading || settings === undefined;

  return (
    <SettingsCard>
      <Field.Root>
        <Field.Label>本机默认设置</Field.Label>
        <Field.Description>
          这些默认值适用于本机的工作区，保存在 Emdash 数据目录中。直接修改配置文件后，此处会实时更新。
        </Field.Description>
      </Field.Root>
      <div className="mt-4 flex flex-col gap-4">
        {parseError ? (
          <div className="text-sm text-foreground-error">
            无法解析本机设置文件。修复前将使用默认设置。
          </div>
        ) : null}

        <Field.Root>
          <Field.Label>Shell 初始化</Field.Label>
          <Field.Description className="text-foreground-muted">
            在每个生命周期脚本和终端会话之前运行的 Shell 命令，例如 nvm 或 mise。工作区可通过 .emdash.json 的 shellSetup 覆盖此设置。
          </Field.Description>
          <Textarea
            placeholder={'nvm use\nsource .envrc'}
            value={shellSetup}
            disabled={disabled}
            onFocus={() => setEditing('shellSetup')}
            onChange={(event) => setShellSetup(event.target.value)}
            onBlur={(event) => commitText('shellSetup', event.target.value)}
          />
        </Field.Root>

        <Separator />

        <Field.Root>
          <Field.Label>工作树根目录</Field.Label>
          <Field.Description className="text-foreground-muted">
            新工作树默认建在此目录下。各项目可覆盖此设置。
          </Field.Description>
          <Input
            placeholder="~/emdash/worktrees"
            value={worktreeRoot}
            disabled={disabled}
            onFocus={() => setEditing('worktreeRoot')}
            onChange={(event) => setWorktreeRoot(event.target.value)}
            onBlur={(event) => commitText('worktreeRoot', event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </Field.Root>

        <Separator />

        <Field.Root orientation="horizontal">
          <div className="flex flex-1 flex-col gap-1">
            <Field.Label>默认启用 tmux</Field.Label>
            <Field.Description className="text-foreground-muted">
              设置本机会话是否默认使用 tmux。各项目可覆盖此设置。
            </Field.Description>
          </div>
          <Switch
            checked={tmuxSupported ? (settings?.tmux ?? false) : false}
            disabled={disabled || !tmuxSupported}
            onCheckedChange={(checked) => void commit({ tmux: checked })}
          />
          {!tmuxSupported ? (
            <div className="text-sm text-foreground-muted">
              Windows 会话无法使用 tmux。此偏好会保留。
            </div>
          ) : null}
        </Field.Root>

      </div>
    </SettingsCard>
  );
});

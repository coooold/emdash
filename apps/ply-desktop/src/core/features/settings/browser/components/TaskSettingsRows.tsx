import { Switch, Tooltip } from '@ply/ui/react/primitives';
import { Info } from 'lucide-react';
import React from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { useTaskSettings } from '@core/features/tasks/api/browser/hooks/useTaskSettings';
import { detectPlatformContext } from '@core/primitives/keybindings/api';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

function InfoTooltip({ label, content }: { label: string; content: React.ReactNode }) {
  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <button
            type="button"
            className="text-muted-foreground inline-flex h-4 w-4 items-center justify-center hover:text-foreground"
            aria-label={label}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content side="top" className="max-w-xs text-xs">
          {content}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export const AutoGenerateTaskNamesRow: React.FC = () => {
  const taskSettings = useTaskSettings();

  return (
    <SettingRow
      title="自动生成任务名称"
      description="创建任务时自动建议名称。"
      control={
        <>
          <ResetToDefaultButton
            visible={taskSettings.isFieldOverridden('autoGenerateName')}
            defaultLabel="开启"
            onReset={taskSettings.resetAutoGenerateName}
            disabled={taskSettings.loading || taskSettings.saving}
          />
          <Switch
            checked={taskSettings.autoGenerateName}
            disabled={taskSettings.loading || taskSettings.saving}
            onCheckedChange={taskSettings.updateAutoGenerateName}
          />
        </>
      }
    />
  );
};

export const AutoTrustWorktreesRow: React.FC = () => {
  const taskSettings = useTaskSettings();

  return (
    <SettingRow
      title={
        <div className="flex items-center gap-1.5">
          自动信任工作树目录
          <InfoTooltip
            label="了解自动信任工作树"
            content="启动支持工作区信任的智能体之前，ply 会添加相应的信任记录。"
          />
        </div>
      }
      description="新任务在支持的 CLI 中可跳过文件夹信任提示。"
      control={
        <>
          <ResetToDefaultButton
            visible={taskSettings.isFieldOverridden('autoTrustWorktrees')}
            defaultLabel="开启"
            onReset={taskSettings.resetAutoTrustWorktrees}
            disabled={taskSettings.loading || taskSettings.saving}
          />
          <Switch
            checked={taskSettings.autoTrustWorktrees}
            disabled={taskSettings.loading || taskSettings.saving}
            onCheckedChange={taskSettings.updateAutoTrustWorktrees}
          />
        </>
      }
    />
  );
};

export const CreateBranchAndWorktreeRow: React.FC = () => {
  const taskSettings = useTaskSettings();

  return (
    <SettingRow
      title="默认创建分支和工作树"
      description="从分支创建任务时，默认使用专用分支和工作树。可在创建任务时调整。"
      control={
        <>
          <ResetToDefaultButton
            visible={taskSettings.isFieldOverridden('createBranchAndWorktree')}
            defaultLabel="开启"
            onReset={taskSettings.resetCreateBranchAndWorktree}
            disabled={taskSettings.loading || taskSettings.saving}
          />
          <Switch
            checked={taskSettings.createBranchAndWorktree}
            disabled={taskSettings.loading || taskSettings.saving}
            onCheckedChange={taskSettings.updateCreateBranchAndWorktree}
          />
        </>
      }
    />
  );
};

export const DeleteBranchByDefaultRow: React.FC = () => {
  const taskSettings = useTaskSettings();

  return (
    <SettingRow
      title="默认删除任务分支"
      description="删除带有可删除分支的任务时，默认勾选删除分支。"
      control={
        <>
          <ResetToDefaultButton
            visible={taskSettings.isFieldOverridden('deleteBranchByDefault')}
            defaultLabel="关闭"
            onReset={taskSettings.resetDeleteBranchByDefault}
            disabled={taskSettings.loading || taskSettings.saving}
          />
          <Switch
            checked={taskSettings.deleteBranchByDefault}
            disabled={taskSettings.loading || taskSettings.saving}
            onCheckedChange={taskSettings.updateDeleteBranchByDefault}
          />
        </>
      }
    />
  );
};

export const PreserveTaskNameCapitalizationRow: React.FC = () => {
  const taskSettings = useTaskSettings();

  return (
    <SettingRow
      title="保留任务名称中的大小写"
      description="在自动生成或手动输入的任务名称中保留大写字母。默认使用小写。"
      control={
        <>
          <ResetToDefaultButton
            visible={taskSettings.isFieldOverridden('preserveNameCapitalization')}
            defaultLabel="关闭"
            onReset={taskSettings.resetPreserveNameCapitalization}
            disabled={taskSettings.loading || taskSettings.saving}
          />
          <Switch
            checked={taskSettings.preserveNameCapitalization}
            disabled={taskSettings.loading || taskSettings.saving}
            onCheckedChange={taskSettings.updatePreserveNameCapitalization}
          />
        </>
      }
    />
  );
};

export const IncludeIssueContextByDefaultRow: React.FC = () => {
  const taskSettings = useTaskSettings();

  return (
    <SettingRow
      title="默认包含议题上下文"
      description="从议题创建任务时，将其加入发给智能体的首条提示。"
      control={
        <>
          <ResetToDefaultButton
            visible={taskSettings.isFieldOverridden('includeIssueContextByDefault')}
            defaultLabel="开启"
            onReset={taskSettings.resetIncludeIssueContextByDefault}
            disabled={taskSettings.loading || taskSettings.saving}
          />
          <Switch
            checked={taskSettings.includeIssueContextByDefault}
            disabled={taskSettings.loading || taskSettings.saving}
            onCheckedChange={taskSettings.updateIncludeIssueContextByDefault}
          />
        </>
      }
    />
  );
};

export const EnableTmuxRow: React.FC = () => {
  const {
    value: projects,
    update,
    isLoading: loading,
    isSaving: saving,
    isFieldOverridden,
    resetField,
  } = useAppSettingsKey('project');

  const tmuxByDefault = projects?.tmuxByDefault ?? false;
  const tmuxSupported = detectPlatformContext().os !== 'windows';

  return (
    <SettingRow
      title="启用 tmux"
      description={
        tmuxSupported
          ? '默认在 tmux 中运行智能体会话和终端。'
          : 'Windows 会话无法使用 tmux。此偏好会保留。'
      }
      control={
        <>
          <ResetToDefaultButton
            visible={isFieldOverridden('tmuxByDefault')}
            defaultLabel="关闭"
            onReset={() => resetField('tmuxByDefault')}
            disabled={loading || saving || !tmuxSupported}
          />
          <Switch
            checked={tmuxSupported ? tmuxByDefault : false}
            disabled={loading || saving || !tmuxSupported}
            onCheckedChange={(checked) => update({ tmuxByDefault: checked })}
          />
        </>
      }
    />
  );
};

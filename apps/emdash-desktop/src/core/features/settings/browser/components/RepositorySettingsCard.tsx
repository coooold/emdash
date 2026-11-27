import { SettingsCard } from '@emdash/ui/react/patterns';
import { Input, SeparatedList, Switch } from '@emdash/ui/react/primitives';
import React from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { normalizeBranchPrefix } from '@core/primitives/tasks/api';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

const RepositorySettingsCard: React.FC = () => {
  const {
    value: project,
    update: updateProject,
    isLoading: projectLoading,
    isSaving: projectSaving,
    isFieldOverridden: isProjectFieldOverridden,
    resetField: resetProjectField,
  } = useAppSettingsKey('project');
  const branchPrefix = project?.branchPrefix ?? '';
  const appendRandomBranchSuffix = project?.appendRandomBranchSuffix ?? true;
  const pushOnCreate = project?.pushOnCreate ?? true;
  const projectBusy = projectLoading || projectSaving;

  return (
    <SettingsCard>
      <SeparatedList gap="1rem" direction="column">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Input
              key={branchPrefix}
              defaultValue={branchPrefix}
              onBlur={(e) => {
                const next = normalizeBranchPrefix(e.currentTarget.value);
                e.currentTarget.value = next;
                if (next !== branchPrefix) {
                  updateProject({ branchPrefix: next });
                }
              }}
              placeholder="分支前缀"
              aria-label="分支前缀"
              disabled={projectBusy}
              className="flex-1"
            />
            <ResetToDefaultButton
              visible={isProjectFieldOverridden('branchPrefix')}
              defaultLabel="emdash"
              onReset={() => resetProjectField('branchPrefix')}
              disabled={projectBusy}
            />
          </div>
          <div className="text-xs text-foreground-passive">
            留空即可创建无前缀的分支。
          </div>
        </div>
        <SettingRow
          title="随机分支后缀"
          description="给分支名称添加随机后缀。"
          control={
            <>
              <ResetToDefaultButton
                visible={isProjectFieldOverridden('appendRandomBranchSuffix')}
                defaultLabel="开启"
                onReset={() => resetProjectField('appendRandomBranchSuffix')}
                disabled={projectBusy}
              />
              <Switch
                checked={appendRandomBranchSuffix}
                onCheckedChange={(checked) => updateProject({ appendRandomBranchSuffix: checked })}
                disabled={projectBusy}
                aria-label="添加随机分支后缀"
              />
            </>
          }
        />
        <SettingRow
          title="创建时自动推送"
          description="创建分支后推送到选定的 Git 远端并设置上游。"
          control={
            <>
              <ResetToDefaultButton
                visible={isProjectFieldOverridden('pushOnCreate')}
                defaultLabel="开启"
                onReset={() => resetProjectField('pushOnCreate')}
                disabled={projectBusy}
              />
              <Switch
                checked={pushOnCreate}
                onCheckedChange={(checked) => updateProject({ pushOnCreate: checked })}
                disabled={projectBusy}
                aria-label="启用创建时自动推送"
              />
            </>
          }
        />
      </SeparatedList>
    </SettingsCard>
  );
};

export default RepositorySettingsCard;

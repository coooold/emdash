import { SettingsCard } from '@ply/ui/react/patterns';
import { SeparatedList, Switch } from '@ply/ui/react/primitives';
import React from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

const SidebarMetadataSettingsCard: React.FC = () => {
  const {
    value: interfaceSettings,
    update,
    isLoading,
    isSaving,
    isFieldOverridden,
    resetField,
  } = useAppSettingsKey('interface');

  const busy = isLoading || isSaving;
  const showLineChanges = interfaceSettings?.showLeftSidebarLineChanges ?? true;
  const showPrStatus = interfaceSettings?.showLeftSidebarPrStatus ?? true;
  const showTimestamps = interfaceSettings?.showLeftSidebarTimestamps ?? true;

  return (
    <SettingsCard>
      <SeparatedList gap="1rem" direction="column">
        <SettingRow
          title="侧边栏中的行数变更"
          description="在左侧边栏显示任务新增和删除的行数。"
          control={
            <>
              <ResetToDefaultButton
                visible={isFieldOverridden('showLeftSidebarLineChanges')}
                defaultLabel="开启"
                onReset={() => resetField('showLeftSidebarLineChanges')}
                disabled={busy}
              />
              <Switch
                checked={showLineChanges}
                onCheckedChange={(checked) => update({ showLeftSidebarLineChanges: checked })}
                disabled={busy}
                aria-label="显示侧边栏中的行数变更"
              />
            </>
          }
        />
        <SettingRow
          title="侧边栏中的拉取请求状态"
          description="在左侧边栏显示 GitHub 拉取请求的合并和状态图标。"
          control={
            <>
              <ResetToDefaultButton
                visible={isFieldOverridden('showLeftSidebarPrStatus')}
                defaultLabel="开启"
                onReset={() => resetField('showLeftSidebarPrStatus')}
                disabled={busy}
              />
              <Switch
                checked={showPrStatus}
                onCheckedChange={(checked) => update({ showLeftSidebarPrStatus: checked })}
                disabled={busy}
                aria-label="显示侧边栏中的拉取请求状态"
              />
            </>
          }
        />
        <SettingRow
          title="侧边栏中的时间戳"
          description="在左侧边栏显示任务的相对时间。"
          control={
            <>
              <ResetToDefaultButton
                visible={isFieldOverridden('showLeftSidebarTimestamps')}
                defaultLabel="开启"
                onReset={() => resetField('showLeftSidebarTimestamps')}
                disabled={busy}
              />
              <Switch
                checked={showTimestamps}
                onCheckedChange={(checked) => update({ showLeftSidebarTimestamps: checked })}
                disabled={busy}
                aria-label="显示侧边栏中的时间戳"
              />
            </>
          }
        />
      </SeparatedList>
    </SettingsCard>
  );
};

export default SidebarMetadataSettingsCard;

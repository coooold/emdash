import { SettingsCard } from '@ply/ui/react/patterns';
import { Button, Select, SeparatedList, Switch, Tooltip } from '@ply/ui/react/primitives';
import { FolderOpen, Play } from 'lucide-react';
import React from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { configureSoundPlayer, soundPlayer } from '@core/features/settings/browser/sound-player';
import type { NotificationSettings } from '@core/primitives/app-settings/api';
import { getHostClient } from '@core/primitives/desktop-host/browser/host-client';
import { cn } from '@core/primitives/styling/browser/cn';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

const getFileName = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] || trimmed;
};

function PreviewSoundButton({
  path,
  disabled,
}: {
  path: string;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon
              className="text-muted-foreground hover:text-foreground"
              disabled={disabled}
              onClick={() => soundPlayer.preview(path)}
              aria-label="试听提示音"
            >
              <Play className="size-3.5" />
            </Button>
          }
        />
        <Tooltip.Content side="top">试听</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

const NotificationSettingsCard: React.FC = () => {
  const {
    value: notifications,
    update,
    isLoading: loading,
    isFieldOverridden,
    resetField,
  } = useAppSettingsKey('notifications');

  const currentNotifications: NotificationSettings = notifications ?? {
    enabled: true,
    sound: true,
    customSoundPath: '',
    osNotifications: true,
    soundFocusMode: 'always',
  };
  const customSoundPath = currentNotifications.customSoundPath?.trim() ?? '';

  const updateNotifications = (partial: Partial<NotificationSettings>) => {
    configureSoundPlayer({ ...currentNotifications, ...partial });
    update(partial);
  };

  const resetNotificationField = <K extends keyof NotificationSettings>(
    field: K,
    value: NotificationSettings[K]
  ) => {
    configureSoundPlayer({ ...currentNotifications, [field]: value });
    resetField(field);
  };

  const chooseCustomSound = async () => {
    const result = await (
      await getHostClient()
    ).openSelectAudioFileDialog({
      title: '选择自定义提示音',
      message: '选择用于智能体事件的音频文件',
    });
    if (result) updateNotifications({ customSoundPath: result });
  };

  return (
    <SettingsCard>
      <SeparatedList gap="0.75rem" direction="column">
        <SettingRow
          title="通知"
          description="智能体需要你的注意时发送通知。"
          control={
            <>
              <ResetToDefaultButton
                visible={isFieldOverridden('enabled')}
                defaultLabel="开启"
                onReset={() => resetField('enabled')}
                disabled={loading}
              />
              <Switch
                checked={notifications?.enabled ?? true}
                disabled={loading}
                onCheckedChange={(next) => updateNotifications({ enabled: next })}
              />
            </>
          }
        />
        <div
          className={cn(
            'flex flex-col gap-3',
            !notifications?.enabled && 'pointer-events-none opacity-33'
          )}
        >
          <SeparatedList gap="0.75rem" direction="column">
            <SettingRow
              title="提示音"
              description="智能体有新事件时播放提示音。"
              control={
                <>
                  <ResetToDefaultButton
                    visible={isFieldOverridden('sound')}
                    defaultLabel="开启"
                    onReset={() => resetNotificationField('sound', true)}
                    disabled={loading}
                  />
                  {!customSoundPath && <PreviewSoundButton path="" disabled={loading} />}
                  <Switch
                    checked={notifications?.sound ?? true}
                    disabled={loading}
                    onCheckedChange={(next) => updateNotifications({ sound: next })}
                  />
                </>
              }
            />

            <SettingRow
              title="自定义提示音"
              description="使用音频文件作为提示音。"
              control={
                <>
                  <ResetToDefaultButton
                    visible={isFieldOverridden('customSoundPath')}
                    defaultLabel="内置"
                    onReset={() => resetNotificationField('customSoundPath', '')}
                    disabled={loading}
                  />
                  {customSoundPath && (
                    <PreviewSoundButton path={customSoundPath} disabled={loading} />
                  )}
                  <Tooltip.Provider delay={150}>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        render={
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-muted-foreground max-w-56 bg-transparent font-normal"
                            disabled={loading}
                            onClick={chooseCustomSound}
                            aria-label={customSoundPath ? '更换自定义提示音' : '选择自定义提示音'}
                          >
                            <FolderOpen className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {customSoundPath ? getFileName(customSoundPath) : '选择文件…'}
                            </span>
                          </Button>
                        }
                      />
                      {customSoundPath && (
                        <Tooltip.Content side="top" className="break-all">
                          {customSoundPath}
                        </Tooltip.Content>
                      )}
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </>
              }
            />

            <SettingRow
              title="提示音播放时机"
              description="设置播放提示音的时机。"
              control={
                <>
                  <ResetToDefaultButton
                    visible={isFieldOverridden('soundFocusMode')}
                    defaultLabel="始终播放"
                    onReset={() => resetNotificationField('soundFocusMode', 'always')}
                    disabled={loading}
                  />
                  <Select.Root
                    value={notifications?.soundFocusMode ?? 'always'}
                    onValueChange={(next) =>
                      updateNotifications({ soundFocusMode: next as 'always' | 'unfocused' })
                    }
                  >
                    <Select.Trigger className="w-auto shrink-0 gap-2 capitalize [&>span]:line-clamp-none">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content className="min-w-max">
                      <Select.Item value="always">始终播放</Select.Item>
                      <Select.Item value="unfocused">仅在窗口失焦时播放</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </>
              }
            />

            <SettingRow
              title="系统通知"
              description="ply 失去焦点时，如果智能体需要你的注意或完成任务，则显示系统通知横幅。"
              control={
                <>
                  <ResetToDefaultButton
                    visible={isFieldOverridden('osNotifications')}
                    defaultLabel="开启"
                    onReset={() => resetNotificationField('osNotifications', true)}
                    disabled={loading}
                  />
                  <Switch
                    checked={notifications?.osNotifications ?? true}
                    disabled={loading}
                    onCheckedChange={(next) => updateNotifications({ osNotifications: next })}
                  />
                </>
              }
            />
          </SeparatedList>
        </div>
      </SeparatedList>
    </SettingsCard>
  );
};

export default NotificationSettingsCard;

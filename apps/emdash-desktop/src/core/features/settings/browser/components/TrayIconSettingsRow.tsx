import { Switch } from '@emdash/ui/react/primitives';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { detectPlatformContext } from '@core/primitives/keybindings/api';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

export function TrayIconSettingsRow() {
  const { value, update, isLoading, isSaving, isFieldOverridden, resetField } =
    useAppSettingsKey('interface');
  const location = detectPlatformContext().os === 'mac' ? '菜单栏' : '系统托盘';
  const title = `在${location}中显示 Emdash`;
  const disabled = isLoading || isSaving;

  return (
    <SettingRow
      title={title}
      description={`通过${location}快速打开 Emdash。`}
      control={
        <>
          <ResetToDefaultButton
            visible={isFieldOverridden('showTrayIcon')}
            defaultLabel="显示"
            onReset={() => resetField('showTrayIcon')}
            disabled={disabled}
          />
          <Switch
            aria-label={title}
            checked={value?.showTrayIcon ?? true}
            disabled={disabled}
            onCheckedChange={(checked) => update({ showTrayIcon: checked })}
          />
        </>
      }
    />
  );
}

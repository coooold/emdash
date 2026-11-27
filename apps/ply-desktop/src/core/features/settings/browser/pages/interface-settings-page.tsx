import { PageLayout, SettingsSection } from '@ply/ui/react/patterns';
import FilesSettingsCard from '../components/FilesSettingsCard';
import HiddenToolsSettingsCard from '../components/HiddenToolsSettingsCard';
import InterfaceSettingsCard from '../components/InterfaceSettingsCard';
import KeyboardSettingsCard from '../components/KeyboardSettingsCard';
import SidebarMetadataSettingsCard from '../components/SidebarMetadataSettingsCard';
import TerminalSettingsCard from '../components/TerminalSettingsCard';
import ThemeCard from '../components/ThemeCard';
import { TrayIconSettingsRow } from '../components/TrayIconSettingsRow';

export function InterfaceSettingsPage() {
  return (
    <div className="space-y-8 pb-4">
      <PageLayout.Header sticky title="界面" description="自定义应用的外观和交互。" />
      <SettingsSection title="配色模式" bare>
        <ThemeCard />
      </SettingsSection>
      <SettingsSection title="应用图标">
        <TrayIconSettingsRow />
      </SettingsSection>
      <SettingsSection title="终端" bare>
        <TerminalSettingsCard />
      </SettingsSection>
      <SettingsSection title="文件" bare>
        <FilesSettingsCard />
      </SettingsSection>
      <SettingsSection title="侧边栏" bare>
        <SidebarMetadataSettingsCard />
      </SettingsSection>
      <SettingsSection bare>
        <InterfaceSettingsCard />
      </SettingsSection>
      <SettingsSection title="键盘快捷键" bare>
        <KeyboardSettingsCard />
      </SettingsSection>
      <SettingsSection title="工具" bare>
        <HiddenToolsSettingsCard />
      </SettingsSection>
    </div>
  );
}

import { PageLayout, SettingsSection } from '@ply/ui/react/patterns';
import RepositorySettingsCard from '../components/RepositorySettingsCard';

export function RepositorySettingsPage() {
  return (
    <div className="space-y-8">
      <PageLayout.Header sticky title="仓库" description="配置仓库和分支设置。" />
      <SettingsSection title="分支" bare>
        <RepositorySettingsCard />
      </SettingsSection>
    </div>
  );
}

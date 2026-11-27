import { PageLayout } from '@emdash/ui/react/patterns';
import { BrowserSettingsCard } from '../components/BrowserSettingsCard';

export function BrowserSettingsPage() {
  return (
    <div className="space-y-8">
      <PageLayout.Header
        sticky
        title="浏览器"
        description="管理浏览器配置和保存的网站登录状态。"
      />
      <BrowserSettingsCard />
    </div>
  );
}

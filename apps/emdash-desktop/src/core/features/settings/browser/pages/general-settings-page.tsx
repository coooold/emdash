import { PageLayout, SettingsSection } from '@emdash/ui/react/patterns';
import NotificationSettingsCard from '../components/NotificationSettingsCard';
import {
  AutoGenerateTaskNamesRow,
  AutoTrustWorktreesRow,
  CreateBranchAndWorktreeRow,
  DeleteBranchByDefaultRow,
  EnableTmuxRow,
  PreserveTaskNameCapitalizationRow,
} from '../components/TaskSettingsRows';
import { UpdateCard } from '../components/UpdateCard';

export function GeneralSettingsPage() {
  return (
    <div className="space-y-8 pb-10">
      <PageLayout.Header
        sticky
        draggable
        title="常规"
        description="管理应用更新和任务偏好。"
      />
      <SettingsSection title="应用">
        <UpdateCard />
      </SettingsSection>
      <SettingsSection title="通知" bare>
        <NotificationSettingsCard />
      </SettingsSection>
      <SettingsSection title="偏好设置">
        <AutoGenerateTaskNamesRow />
        <AutoTrustWorktreesRow />
        <CreateBranchAndWorktreeRow />
        <DeleteBranchByDefaultRow />
        <PreserveTaskNameCapitalizationRow />
        <EnableTmuxRow />
      </SettingsSection>
    </div>
  );
}

import { PageLayout } from '@emdash/ui/react/patterns';
import { MachineConversationsList } from '../components/machine-conversations-list';

export function ConversationsSettingsPage() {
  return (
    <div className="space-y-8 pb-4">
      <PageLayout.Header
        sticky
        title="对话"
        description="查看本机的全部对话记录，包括已解除任务关联的对话。"
      />
      <MachineConversationsList scope={{ kind: 'local' }} hostReachable />
    </div>
  );
}

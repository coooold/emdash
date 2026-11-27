import { observer } from 'mobx-react-lite';
import { SidebarConversationsList } from '@core/features/conversations/contributions/browser/sidebar-conversations-list';
import { ChangesPanel } from '@core/features/source-control/contributions/browser/changes-panel';
import { useTaskComposition } from '@core/features/workbench/api/browser/task-composition-context';

/** Optional right sidebar for conversations and changes. Files always live in the left sidebar. */
export const TaskSidebar = observer(function TaskSidebar() {
  const taskView = useTaskComposition();
  const activeTab = taskView.sidebarTab;

  return (
    <div className="h-full min-h-0 overflow-hidden">
      {activeTab === 'conversations' && <SidebarConversationsList />}
      {activeTab === 'changes' && <ChangesPanel />}
    </div>
  );
});

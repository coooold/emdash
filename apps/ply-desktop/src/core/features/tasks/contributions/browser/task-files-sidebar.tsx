import { observer } from 'mobx-react-lite';
import { EditorFileTree } from '@core/features/editor/contributions/browser/editor-file-tree';
import { useTaskViewKind } from '@core/features/tasks/contributions/browser/task-view-context';
import {
  useTaskComposition,
  useWorkspace,
} from '@core/features/workbench/api/browser/task-composition-context';
import { taskTabView } from '@core/features/workbench/api/browser/task-tab-registry';

export const TaskFilesSidebar = observer(function TaskFilesSidebar() {
  const kind = useTaskViewKind();
  if (kind !== 'ready') return null;
  return <ReadyTaskFilesSidebar />;
});

const ReadyTaskFilesSidebar = observer(function ReadyTaskFilesSidebar() {
  const taskView = useTaskComposition();
  const workspace = useWorkspace();
  return (
    <section
      aria-label="任务文件"
      className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border"
    >
      <taskTabView.TabLayoutProvider layout={taskView.paneLayout}>
        {/* Reset transient search, selection and clipboard when the active worktree changes. */}
        <EditorFileTree key={`${taskView.taskId}:${workspace.workspaceId}:${workspace.path}`} />
      </taskTabView.TabLayoutProvider>
    </section>
  );
});

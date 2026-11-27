import { CalendarRange } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Titlebar } from '@core/features/workbench/contributions/browser/Titlebar';
import { defineViewRuntime } from '@core/primitives/views/react';
import type {
  ManualPlanAction,
  ManualPlanDocument,
  ManualPlanProject,
  ManualPlanRequirement,
  ManualPlanTask,
} from '../api/manual-plan';
import { plansViewDef } from '../contributions/views';
import { useApplyPlanAction, usePlans } from './use-plans';

export function PlansView() {
  const { data, isPending, error } = usePlans();
  const action = useApplyPlanAction();
  const [projectTitle, setProjectTitle] = useState('');
  const [actionError, setActionError] = useState('');
  const timeline = useMemo(() => resolveTimeline(data), [data]);

  async function apply(input: Parameters<typeof action.mutateAsync>[0]) {
    setActionError('');
    try {
      await action.mutateAsync(input);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '计划更新失败');
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Titlebar leftSlot={<span className="px-3 text-sm font-medium">计划</span>} />
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <header>
            <h1 className="text-xl font-semibold">手工计划</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              管理项目、需求与子任务。计划只保存本地，不会自动调用 Agent。
            </p>
          </header>

          <form
            className="flex max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const title = projectTitle.trim();
              if (!title) return;
              void apply({ type: 'create-project', title }).then(() => setProjectTitle(''));
            }}
          >
            <input
              aria-label="新项目名称"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.currentTarget.value)}
              placeholder="项目名称"
              maxLength={160}
            />
            <button
              className="bg-accent text-accent-foreground rounded-md px-3 py-2 text-sm"
              type="submit"
            >
              新建项目
            </button>
          </form>

          {actionError && (
            <p role="alert" className="text-destructive text-sm">
              {actionError}
            </p>
          )}
          {isPending && <p role="status">正在加载计划…</p>}
          {error && <p role="alert">计划加载失败</p>}
          {data?.projects.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground-muted">
              先创建一个计划项目。
            </div>
          )}
          <div className="flex flex-col gap-5">
            {data?.projects
              .slice()
              .sort(compareOrder)
              .map((project) => (
                <PlanProjectCard
                  key={project.id}
                  project={project}
                  timeline={timeline}
                  onApply={apply}
                />
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PlanProjectCard({
  project,
  timeline,
  onApply,
}: {
  project: ManualPlanProject;
  timeline: { start: string; days: number };
  onApply(action: ManualPlanAction): Promise<void>;
}) {
  const [requirementTitle, setRequirementTitle] = useState('');
  const tasks = project.requirements.flatMap((requirement) => requirement.tasks);
  const orderedRequirements = project.requirements.slice().sort(compareOrder);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background-secondary">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-medium">{project.title}</h2>
        <span className="text-xs text-foreground-muted">{project.requirements.length} 个需求</span>
      </div>

      <form
        className="flex gap-2 border-b border-border px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          const title = requirementTitle.trim();
          if (!title) return;
          void onApply({ type: 'create-requirement', projectId: project.id, title }).then(() =>
            setRequirementTitle('')
          );
        }}
      >
        <input
          aria-label={`新需求名称 ${project.title}`}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          value={requirementTitle}
          onChange={(event) => setRequirementTitle(event.currentTarget.value)}
          placeholder="需求名称"
          maxLength={160}
        />
        <button className="rounded-md border border-border px-3 py-1.5 text-sm" type="submit">
          新建需求
        </button>
      </form>

      {orderedRequirements.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(180px,1fr)_140px_140px_220px_minmax(260px,2fr)] gap-2 border-b border-border px-4 py-2 text-xs text-foreground-muted">
              <span>子任务</span>
              <span>开始日期</span>
              <span>结束日期</span>
              <span>依赖</span>
              <div className="flex items-center gap-2">
                <CalendarRange className="size-3.5" />
                <TimelineHeader timeline={timeline} />
              </div>
            </div>
            {orderedRequirements.map((requirement) => (
              <PlanRequirement
                key={requirement.id}
                project={project}
                requirement={requirement}
                allTasks={tasks}
                timeline={timeline}
                onApply={onApply}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PlanRequirement({
  project,
  requirement,
  allTasks,
  timeline,
  onApply,
}: {
  project: ManualPlanProject;
  requirement: ManualPlanRequirement;
  allTasks: ManualPlanTask[];
  timeline: { start: string; days: number };
  onApply: (action: ManualPlanAction) => Promise<void>;
}) {
  const [taskTitle, setTaskTitle] = useState('');
  const orderedTasks = requirement.tasks.slice().sort(compareOrder);
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between bg-background-1 px-4 py-2">
        <button
          aria-expanded={requirement.expanded}
          className="flex items-center gap-2 text-left text-sm font-medium"
          onClick={() =>
            void onApply({
              type: 'set-requirement-expanded',
              projectId: project.id,
              requirementId: requirement.id,
              expanded: !requirement.expanded,
            })
          }
          type="button"
        >
          <span aria-hidden>{requirement.expanded ? '⌄' : '›'}</span>
          {requirement.title}
          <span className="text-xs font-normal text-foreground-muted">
            {requirement.tasks.length}
          </span>
        </button>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const title = taskTitle.trim();
            if (!title) return;
            void onApply({
              type: 'create-task',
              projectId: project.id,
              requirementId: requirement.id,
              title,
            }).then(() => setTaskTitle(''));
          }}
        >
          <input
            aria-label={`新子任务名称 ${requirement.title}`}
            className="w-44 rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.currentTarget.value)}
            placeholder="子任务名称"
            maxLength={160}
          />
          <button className="rounded-md border border-border px-2 py-1 text-xs" type="submit">
            添加子任务
          </button>
        </form>
      </div>

      {requirement.expanded &&
        orderedTasks.map((task, index) => (
          <PlanTaskRow
            key={task.id}
            task={task}
            taskIndex={index}
            taskCount={orderedTasks.length}
            projectId={project.id}
            allTasks={allTasks}
            timeline={timeline}
            onApply={onApply}
          />
        ))}
    </div>
  );
}

function PlanTaskRow({
  task,
  taskIndex,
  taskCount,
  projectId,
  allTasks,
  timeline,
  onApply,
}: {
  task: ManualPlanTask;
  taskIndex: number;
  taskCount: number;
  projectId: string;
  allTasks: ManualPlanTask[];
  timeline: { start: string; days: number };
  onApply: (action: ManualPlanAction) => Promise<void>;
}) {
  const taskName = task.title;
  const potentialDependencies = allTasks.filter(({ id }) => id !== task.id);
  const dependencyNames = new Map(allTasks.map(({ id, title }) => [id, title]));
  const startOffset = daysBetween(timeline.start, task.startDate);
  const endOffset = daysBetween(timeline.start, task.endDate) + 1;
  const left = (startOffset / timeline.days) * 100;
  const width = (Math.max(1, endOffset - startOffset) / timeline.days) * 100;

  return (
    <div className="grid grid-cols-[minmax(180px,1fr)_140px_140px_220px_minmax(260px,2fr)] items-center gap-2 border-t border-border/60 px-4 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate" title={task.title}>
          {task.title}
        </span>
        <button
          aria-label={`上移 ${taskName}`}
          className="rounded px-1 text-foreground-muted disabled:opacity-30"
          disabled={taskIndex === 0}
          onClick={() =>
            void onApply({ type: 'move-task', projectId, taskId: task.id, direction: 'up' })
          }
          type="button"
        >
          ↑
        </button>
        <button
          aria-label={`下移 ${taskName}`}
          className="rounded px-1 text-foreground-muted disabled:opacity-30"
          disabled={taskIndex === taskCount - 1}
          onClick={() =>
            void onApply({ type: 'move-task', projectId, taskId: task.id, direction: 'down' })
          }
          type="button"
        >
          ↓
        </button>
      </div>
      <input
        aria-label={`开始日期 ${taskName}`}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        type="date"
        value={task.startDate}
        onChange={(event) =>
          void onApply({
            type: 'update-task',
            projectId,
            taskId: task.id,
            patch: { startDate: event.currentTarget.value },
          })
        }
      />
      <input
        aria-label={`结束日期 ${taskName}`}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        type="date"
        value={task.endDate}
        onChange={(event) =>
          void onApply({
            type: 'update-task',
            projectId,
            taskId: task.id,
            patch: { endDate: event.currentTarget.value },
          })
        }
      />
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {task.dependsOn.map((dependencyId) => (
          <button
            aria-label={`移除依赖 ${dependencyNames.get(dependencyId) ?? dependencyId} ${taskName}`}
            className="rounded bg-background-1 px-1.5 py-0.5 text-xs"
            key={dependencyId}
            onClick={() =>
              void onApply({
                type: 'set-dependency',
                projectId,
                taskId: task.id,
                dependsOnTaskId: dependencyId,
                enabled: false,
              })
            }
            type="button"
          >
            {dependencyNames.get(dependencyId) ?? dependencyId} ×
          </button>
        ))}
        <select
          aria-label={`添加依赖 ${taskName}`}
          className="max-w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
          value=""
          onChange={(event) => {
            const dependsOnTaskId = event.currentTarget.value;
            if (dependsOnTaskId) {
              void onApply({
                type: 'set-dependency',
                projectId,
                taskId: task.id,
                dependsOnTaskId,
                enabled: true,
              });
            }
          }}
        >
          <option value="">添加依赖…</option>
          {potentialDependencies
            .slice()
            .sort(compareOrder)
            .map((dependency) => (
              <option
                disabled={task.dependsOn.includes(dependency.id)}
                key={dependency.id}
                value={dependency.id}
              >
                {dependency.title}
              </option>
            ))}
        </select>
      </div>
      <div
        aria-label={`甘特条 ${taskName}`}
        className="relative h-6 overflow-hidden rounded bg-background-1"
        role="img"
        style={{ minWidth: `${Math.max(260, timeline.days * 28)}px` }}
      >
        <div
          className="bg-accent absolute inset-y-1 rounded"
          style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
          title={`${task.startDate} — ${task.endDate}`}
        />
      </div>
    </div>
  );
}

function TimelineHeader({ timeline }: { timeline: { start: string; days: number } }) {
  return (
    <div
      className="flex min-w-0 flex-1 gap-0.5 overflow-hidden"
      aria-label="日期轴"
      style={{ minWidth: `${Math.max(260, timeline.days * 28)}px` }}
    >
      {Array.from({ length: timeline.days }, (_, index) => {
        const date = addUtcDays(timeline.start, index);
        return (
          <span className="min-w-5 flex-1 text-center" key={date}>
            {date.slice(5)}
          </span>
        );
      })}
    </div>
  );
}

function resolveTimeline(document: ManualPlanDocument | undefined) {
  const dates =
    document?.projects.flatMap((project) =>
      project.requirements.flatMap((requirement) =>
        requirement.tasks.flatMap((task) => [task.startDate, task.endDate])
      )
    ) ?? [];
  if (dates.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, days: 7 };
  }
  const sortedDates = dates.slice().sort();
  const start = sortedDates[0]!;
  const end = sortedDates.at(-1)!;
  return { start, days: Math.max(1, daysBetween(start, end) + 1) };
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function addUtcDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function compareOrder(left: { order: number; id: string }, right: { order: number; id: string }) {
  return left.order - right.order || left.id.localeCompare(right.id);
}

export const plansViewRuntime = defineViewRuntime(plansViewDef, {
  slots: {
    wrap: Fragment,
    main: PlansView,
  },
});

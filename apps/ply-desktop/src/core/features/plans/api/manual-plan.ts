import { z } from 'zod';

const idSchema = z.string().min(1);
const titleSchema = z.string().trim().min(1).max(160);
export const manualPlanDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, '日期无效');

export const manualPlanTaskSchema = z.object({
  id: idSchema,
  title: titleSchema,
  order: z.number().int().nonnegative(),
  startDate: manualPlanDateSchema,
  endDate: manualPlanDateSchema,
  dependsOn: z.array(idSchema),
});

export const manualPlanRequirementSchema = z.object({
  id: idSchema,
  title: titleSchema,
  order: z.number().int().nonnegative(),
  expanded: z.boolean(),
  tasks: z.array(manualPlanTaskSchema),
});

export const manualPlanProjectSchema = z.object({
  id: idSchema,
  title: titleSchema,
  order: z.number().int().nonnegative(),
  requirements: z.array(manualPlanRequirementSchema),
});

export const manualPlanDocumentSchema = z.object({
  version: z.literal(1),
  projects: z.array(manualPlanProjectSchema),
});

const taskPatchSchema = z
  .object({
    title: titleSchema.optional(),
    startDate: manualPlanDateSchema.optional(),
    endDate: manualPlanDateSchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, '至少修改一个字段');

export const manualPlanActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create-project'), title: titleSchema }),
  z.object({
    type: z.literal('create-requirement'),
    projectId: idSchema,
    title: titleSchema,
  }),
  z.object({
    type: z.literal('create-task'),
    projectId: idSchema,
    requirementId: idSchema,
    title: titleSchema,
  }),
  z.object({
    type: z.literal('set-requirement-expanded'),
    projectId: idSchema,
    requirementId: idSchema,
    expanded: z.boolean(),
  }),
  z.object({
    type: z.literal('update-task'),
    projectId: idSchema,
    taskId: idSchema,
    patch: taskPatchSchema,
  }),
  z.object({
    type: z.literal('move-task'),
    projectId: idSchema,
    taskId: idSchema,
    direction: z.enum(['up', 'down']),
  }),
  z.object({
    type: z.literal('set-dependency'),
    projectId: idSchema,
    taskId: idSchema,
    dependsOnTaskId: idSchema,
    enabled: z.boolean(),
  }),
]);

export const manualPlanErrorSchema = z.object({
  code: z.enum([
    'not-found',
    'invalid-date-range',
    'self-dependency',
    'dependency-cycle',
    'invalid-document',
    'storage-error',
  ]),
  message: z.string(),
});

export type ManualPlanDocument = z.infer<typeof manualPlanDocumentSchema>;
export type ManualPlanProject = z.infer<typeof manualPlanProjectSchema>;
export type ManualPlanRequirement = z.infer<typeof manualPlanRequirementSchema>;
export type ManualPlanTask = z.infer<typeof manualPlanTaskSchema>;
export type ManualPlanAction = z.infer<typeof manualPlanActionSchema>;
export type ManualPlanError = z.infer<typeof manualPlanErrorSchema>;

export class ManualPlanMutationError extends Error {
  constructor(
    readonly code: ManualPlanError['code'],
    message: string
  ) {
    super(message);
  }
}

export function emptyManualPlan(): ManualPlanDocument {
  return { version: 1, projects: [] };
}

export function validateManualPlanDocument(value: unknown): ManualPlanDocument {
  const parsed = manualPlanDocumentSchema.safeParse(value);
  if (!parsed.success) {
    throw new ManualPlanMutationError('invalid-document', '计划数据格式无效');
  }

  const ids = new Set<string>();
  const tasks = new Map<string, { projectId: string; dependsOn: string[] }>();
  for (const project of parsed.data.projects) {
    addUniqueId(ids, project.id);
    for (const requirement of project.requirements) {
      addUniqueId(ids, requirement.id);
      for (const task of requirement.tasks) {
        addUniqueId(ids, task.id);
        if (task.endDate < task.startDate) {
          throw new ManualPlanMutationError(
            'invalid-date-range',
            `子任务「${task.title}」的结束日期早于开始日期`
          );
        }
        if (new Set(task.dependsOn).size !== task.dependsOn.length) {
          throw new ManualPlanMutationError('invalid-document', '依赖关系存在重复项');
        }
        tasks.set(task.id, { projectId: project.id, dependsOn: task.dependsOn });
      }
    }
  }

  for (const [taskId, task] of tasks) {
    for (const dependencyId of task.dependsOn) {
      if (dependencyId === taskId) {
        throw new ManualPlanMutationError('self-dependency', '子任务不能依赖自身');
      }
      const dependency = tasks.get(dependencyId);
      if (!dependency || dependency.projectId !== task.projectId) {
        throw new ManualPlanMutationError('invalid-document', '依赖必须指向同一项目中的子任务');
      }
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (taskId: string): void => {
    if (visiting.has(taskId)) {
      throw new ManualPlanMutationError('dependency-cycle', '该依赖会形成循环');
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependencyId of tasks.get(taskId)?.dependsOn ?? []) visit(dependencyId);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const taskId of tasks.keys()) visit(taskId);

  return parsed.data;
}

export function applyManualPlanAction(
  document: ManualPlanDocument,
  action: ManualPlanAction,
  options: { createId(): string; today: string }
): ManualPlanDocument {
  const next = structuredClone(validateManualPlanDocument(document));
  const project =
    'projectId' in action ? next.projects.find(({ id }) => id === action.projectId) : undefined;

  switch (action.type) {
    case 'create-project':
      next.projects.push({
        id: options.createId(),
        title: action.title,
        order: next.projects.length,
        requirements: [],
      });
      break;
    case 'create-requirement': {
      if (!project) throw notFound('项目');
      project.requirements.push({
        id: options.createId(),
        title: action.title,
        order: project.requirements.length,
        expanded: true,
        tasks: [],
      });
      break;
    }
    case 'create-task': {
      if (!project) throw notFound('项目');
      const requirement = project.requirements.find(({ id }) => id === action.requirementId);
      if (!requirement) throw notFound('需求');
      requirement.tasks.push({
        id: options.createId(),
        title: action.title,
        order: requirement.tasks.length,
        startDate: options.today,
        endDate: addUtcDays(options.today, 1),
        dependsOn: [],
      });
      break;
    }
    case 'set-requirement-expanded': {
      const requirement = project?.requirements.find(({ id }) => id === action.requirementId);
      if (!requirement) throw notFound('需求');
      requirement.expanded = action.expanded;
      break;
    }
    case 'update-task': {
      const task = findTask(project, action.taskId);
      if (!task) throw notFound('子任务');
      Object.assign(task, action.patch);
      if (task.endDate < task.startDate) {
        throw new ManualPlanMutationError('invalid-date-range', '结束日期不能早于开始日期');
      }
      break;
    }
    case 'move-task': {
      const requirement = project?.requirements.find(({ tasks }) =>
        tasks.some(({ id }) => id === action.taskId)
      );
      if (!requirement) throw notFound('子任务');
      const tasks = [...requirement.tasks].sort(compareOrder);
      const index = tasks.findIndex(({ id }) => id === action.taskId);
      const target = action.direction === 'up' ? index - 1 : index + 1;
      if (target >= 0 && target < tasks.length) {
        [tasks[index], tasks[target]] = [tasks[target]!, tasks[index]!];
        requirement.tasks = tasks.map((task, order) => ({ ...task, order }));
      }
      break;
    }
    case 'set-dependency': {
      const task = findTask(project, action.taskId);
      const dependency = findTask(project, action.dependsOnTaskId);
      if (!task || !dependency) throw notFound('子任务');
      if (action.enabled && task.id === dependency.id) {
        throw new ManualPlanMutationError('self-dependency', '子任务不能依赖自身');
      }
      if (action.enabled) {
        if (wouldCreateCycle(project, task.id, dependency.id)) {
          throw new ManualPlanMutationError('dependency-cycle', '该依赖会形成循环');
        }
        if (!task.dependsOn.includes(dependency.id)) task.dependsOn.push(dependency.id);
      } else {
        task.dependsOn = task.dependsOn.filter((id) => id !== dependency.id);
      }
      break;
    }
  }

  return validateManualPlanDocument(next);
}

function wouldCreateCycle(
  project: ManualPlanProject | undefined,
  taskId: string,
  dependencyId: string
) {
  const tasks = new Map<string, ManualPlanTask>();
  for (const requirement of project?.requirements ?? []) {
    for (const task of requirement.tasks) tasks.set(task.id, task);
  }
  const visited = new Set<string>();
  const reachesTask = (currentId: string): boolean => {
    if (currentId === taskId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    return (tasks.get(currentId)?.dependsOn ?? []).some(reachesTask);
  };
  return reachesTask(dependencyId);
}

function findTask(project: ManualPlanProject | undefined, taskId: string) {
  for (const requirement of project?.requirements ?? []) {
    const task = requirement.tasks.find(({ id }) => id === taskId);
    if (task) return task;
  }
}

function addUniqueId(ids: Set<string>, id: string) {
  if (ids.has(id)) throw new ManualPlanMutationError('invalid-document', '计划数据包含重复 ID');
  ids.add(id);
}

function addUtcDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function compareOrder(left: { order: number; id: string }, right: { order: number; id: string }) {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function notFound(entity: string) {
  return new ManualPlanMutationError('not-found', `${entity}不存在`);
}
